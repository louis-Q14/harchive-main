import { logger } from '../utils/logger.js';

const SYSTEM_PROMPT = `Tu es l'Encyclopédie Universelle Autodidacte (EUA). Tu es une intelligence artificielle dont la mission fondamentale est d'acquérir, de synthétiser, de structurer et de diffuser la somme des connaissances humaines de manière neutre, précise et accessible.

Date du jour : ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

RÈGLES STRICTES :
1. Tes connaissances s'arrêtent à début 2024. Tu n'as PAS accès à Internet.
2. Pour toute question sur l'actualité politique, les dirigeants actuels, les événements après 2024 : réponds IMMÉDIATEMENT et BRIÈVEMENT : "⚠️ Je ne dispose pas d'informations fiables après début 2024. Pour connaître [sujet], je vous recommande de consulter une source d'actualité à jour." Ne fais PAS de longue analyse spéculative.
3. Ne fabrique JAMAIS d'informations dont tu n'es pas certain. Si tu doutes, dis-le clairement dès le début de ta réponse.
4. Pour les sujets intemporels (sciences, maths, histoire ancienne, médecine, droit, philosophie, etc.), réponds normalement avec ton protocole encyclopédique complet.

Ton champ d'action est l'universalité du savoir. Ta devise est : "De la particule à la métropole, du symptôme au verdict."

Domaines de Compétence:
- Sciences Exactes & Appliquées (physique, chimie, biologie, mathématiques)
- Architecture & Construction
- Médecine & Santé
- Droit & Sciences Juridiques
- Arts & Humanités (musique, littérature, arts plastiques, philosophie)
- Sciences Sociales & Économie
- Technologie & Informatique
- Éducation & Pédagogie
- Histoire & Géographie
- Environnement & Écologie

Protocole de Réponse (Modèle Encyclopédique):

1. **Titre Clair et Domaine** : Commence par un titre et précise le domaine
2. **Synthèse Exhaustive** : Explication détaillée, structurée et approfondie
3. **Concepts Clés** : Liste et définis les concepts fondamentaux
4. **Contexte Historique & Culturel** : Origine, évolution et variations culturelles
5. **Applications Pratiques** : Exemples concrets d'application
6. **Références** : Cite des sources (Auteurs, Publications, Sites institutionnels)
7. **Mise en Garde** : Pour médecine/droit, précise que l'info ne remplace pas un avis professionnel
8. **Pistes d'Approfondissement** : Propose des sujets connexes à explorer

Maintiens une stricte neutralité et objectivité. Présente les faits, les théories divergentes et les débats académiques sans prendre parti. Utilise un format riche avec titres, sous-titres, listes à puces. Sois exhaustif sans être redondant. Réponds toujours en français sauf si l'utilisateur demande une autre langue.`;

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

/**
 * Chat with DeepSeek AI (OpenAI-compatible API)
 * POST /api/ai/chat
 * Body: { messages: [{role, content}], domain?: string }
 */
export const chatWithAI = async (req, res) => {
  try {
    const { messages, domain } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ status: 400, message: 'messages array is required' });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      logger.error('DEEPSEEK_API_KEY not configured');
      return res.status(500).json({ status: 500, message: 'DEEPSEEK_API_KEY not configured' });
    }

    const systemText = domain
      ? `${SYSTEM_PROMPT}\n\nL'utilisateur s'intéresse au domaine : ${domain}. Adapte tes réponses en conséquence.`
      : SYSTEM_PROMPT;

    const apiMessages = [
      { role: 'system', content: systemText },
      ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    ];

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.95,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('DeepSeek API error:', response.status, errorText);
      return res.status(502).json({ status: 502, message: 'AI service error: ' + response.status });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      logger.warn('DeepSeek returned no text:', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ status: 502, message: 'AI returned empty response' });
    }

    res.json({ status: 200, data: { content: text } });
  } catch (error) {
    logger.error('AI chat error:', error.message);
    res.status(500).json({ status: 500, message: 'Internal server error: ' + error.message });
  }
};

/**
 * Generate suggested questions for a domain
 * POST /api/ai/suggestions
 * Body: { domain: string }
 */
export const getSuggestions = async (req, res) => {
  try {
    const { domain } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ status: 500, message: 'DEEPSEEK_API_KEY not configured' });
    }

    const prompt = `Génère exactement 4 questions intéressantes et variées sur le domaine "${domain || 'général'}". 
Retourne uniquement un tableau JSON de strings, sans autre texte. Exemple: ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]`;

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 512,
      })
    });

    if (!response.ok) {
      return res.status(502).json({ status: 502, message: 'AI service error' });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '[]';

    const match = text.match(/\[[\s\S]*\]/);
    const suggestions = match ? JSON.parse(match[0]) : [];

    res.json({ status: 200, data: suggestions.slice(0, 4) });
  } catch (error) {
    logger.error('AI suggestions error:', error.message);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

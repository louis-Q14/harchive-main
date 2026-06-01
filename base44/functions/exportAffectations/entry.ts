import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';
import XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { professeur_id, professeur_nom, format } = await req.json();

    // Récupérer les affectations
    const affectations = await base44.asServiceRole.entities.AssignationProfesseur.filter({
      professeur_id: professeur_id,
    }, '-created_date', 500);

    if (format === 'pdf') {
      // Générer PDF
      const doc = new jsPDF();
      
      // Titre
      doc.setFontSize(18);
      doc.text(`Affectations de ${professeur_nom}`, 15, 20);
      
      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 15, 28);
      doc.text(`Total: ${affectations.length} affectation(s)`, 15, 34);

      // En-têtes de tableau
      let y = 45;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Matière', 15, y);
      doc.text('Faculté', 70, y);
      doc.text('Département', 110, y);
      doc.text('Classe', 160, y);
      
      // Ligne de séparation
      doc.line(15, y + 2, 195, y + 2);
      y += 8;

      // Données
      doc.setFont(undefined, 'normal');
      affectations.forEach((aff) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.text(aff.matiere_nom || '-', 15, y);
        doc.text((aff.faculte || '-').substring(0, 20), 70, y);
        doc.text((aff.departement || '-').substring(0, 25), 110, y);
        doc.text(aff.classe_nom || '-', 160, y);
        y += 7;
      });

      const pdfBytes = doc.output('arraybuffer');
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=affectations-${professeur_nom.replace(/\s+/g, '-')}.pdf`
        }
      });
    } else if (format === 'excel') {
      // Créer les données pour Excel avec des données propres
      const data = affectations.map((aff) => ({
        'Matière': aff.matiere_nom || '',
        'Faculté': aff.faculte || '',
        'Département': aff.departement || '',
        'Option': aff.option || '',
        'Orientation': aff.orientation || '',
        'Classe': aff.classe_nom || ''
      }));

      // Créer le workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Ajuster la largeur des colonnes
      ws['!cols'] = [
        { wch: 25 }, // Matière
        { wch: 20 }, // Faculté
        { wch: 25 }, // Département
        { wch: 20 }, // Option
        { wch: 25 }, // Orientation
        { wch: 20 }  // Classe
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Affectations');

      // Écrire en buffer (plus fiable que array pour Deno)
      const buffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'buffer',
        bookSST: false,
        compression: false
      });

      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="affectations-${professeur_nom.replace(/\s+/g, '-')}.xlsx"`,
          'Content-Length': buffer.length.toString()
        }
      });
    }

    return Response.json({ error: 'Format invalide' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
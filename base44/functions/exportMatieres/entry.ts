import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { classeNom, faculte, matieres } = body;

        if (!classeNom || !matieres) {
            return Response.json({ error: 'Missing required data' }, { status: 400 });
        }

        const doc = new jsPDF('portrait', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (2 * margin);

        // Background blanc
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // En-tête avec fond gris clair
        doc.setFillColor(220, 220, 220);
        doc.rect(0, 0, pageWidth, 50, 'F');

        // Titre
        doc.setFontSize(24);
        doc.setTextColor(40, 40, 40);
        doc.setFont('helvetica', 'bold');
        doc.text('Liste des Matieres', margin, 25);

        // Sous-titre classe
        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text(classeNom, margin, 38);

        // Filigrane logo au centre (80% de la page)
        const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/691230093d09cc9fd317fdee/ea0e2fd4b_logoHARCHIVEF.png';
        try {
            const logoResponse = await fetch(logoUrl);
            const logoBlob = await logoResponse.blob();
            const logoBuffer = await logoBlob.arrayBuffer();
            const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoBuffer)));
            const logoDataUrl = 'data:image/png;base64,' + logoBase64;
            
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.06 }));
            const logoWidth = pageWidth * 0.8;
            const logoHeight = logoWidth * 0.3;
            const logoX = (pageWidth - logoWidth) / 2;
            const logoY = pageHeight / 2 - logoHeight / 2;
            doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
            doc.restoreGraphicsState();
        } catch (error) {
            console.log('Logo watermark could not be added:', error);
        }

        // Faculté et date
        let infoY = 60;
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        
        if (faculte) {
            doc.setFont('helvetica', 'bold');
            doc.text('Faculte:', margin, infoY);
            doc.setFont('helvetica', 'normal');
            doc.text(faculte, margin + 20, infoY);
            infoY += 8;
        }

        doc.setFont('helvetica', 'bold');
        doc.text('Date:', margin, infoY);
        doc.setFont('helvetica', 'normal');
        const dateStr = new Date().toLocaleDateString('fr-FR');
        doc.text(dateStr, margin + 15, infoY);

        // Tableau
        let currentY = infoY + 15;
        
        // Largeurs des colonnes
        const colWidths = {
            code: 30,
            matiere: 70,
            heures: 25,
            coeff: 25,
            couleur: 20
        };
        
        let colX = margin;
        
        // En-têtes du tableau
        doc.setFillColor(45, 45, 45);
        doc.rect(margin, currentY, contentWidth, 8, 'F');
        
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        
        doc.text('Code', colX + 2, currentY + 6);
        colX += colWidths.code;
        doc.line(colX, currentY, colX, currentY + 8);
        
        doc.text('Matiere', colX + 2, currentY + 6);
        colX += colWidths.matiere;
        doc.line(colX, currentY, colX, currentY + 8);
        
        doc.text('Heures', colX + 2, currentY + 6);
        colX += colWidths.heures;
        doc.line(colX, currentY, colX, currentY + 8);
        
        doc.text('Coeff', colX + 2, currentY + 6);
        colX += colWidths.coeff;
        doc.line(colX, currentY, colX, currentY + 8);
        
        doc.text('Couleur', colX + 2, currentY + 6);

        // Bordure du header
        doc.setDrawColor(45, 45, 45);
        doc.setLineWidth(0.3);
        doc.rect(margin, currentY, contentWidth, 8);

        // Lignes de données
        currentY += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setDrawColor(220, 220, 220);

        for (let index = 0; index < matieres.length; index++) {
            const matiere = matieres[index];
            
            if (currentY > pageHeight - 40) {
                doc.addPage();
                doc.setFillColor(255, 255, 255);
                doc.rect(0, 0, pageWidth, pageHeight, 'F');
                currentY = 30;
            }
            
            const rowHeight = 7;
            
            // Alternance de couleurs
            if (index % 2 === 0) {
                doc.setFillColor(249, 250, 251);
            } else {
                doc.setFillColor(255, 255, 255);
            }
            doc.rect(margin, currentY, contentWidth, rowHeight, 'F');

            doc.setTextColor(30, 30, 30);
            
            colX = margin;
            
            // Code
            doc.text(matiere.code || '-', colX + 2, currentY + 5);
            doc.line(colX + colWidths.code, currentY, colX + colWidths.code, currentY + rowHeight);
            colX += colWidths.code;
            
            // Matière
            const nomMatiere = matiere.nom.length > 35 ? matiere.nom.substring(0, 32) + '...' : matiere.nom;
            doc.text(nomMatiere, colX + 2, currentY + 5);
            doc.line(colX + colWidths.matiere, currentY, colX + colWidths.matiere, currentY + rowHeight);
            colX += colWidths.matiere;
            
            // Heures
            doc.text(String(matiere.nombre_heures || '-'), colX + 2, currentY + 5);
            doc.line(colX + colWidths.heures, currentY, colX + colWidths.heures, currentY + rowHeight);
            colX += colWidths.heures;
            
            // Coefficient
            doc.text(String(matiere.coefficient || 1), colX + 2, currentY + 5);
            doc.line(colX + colWidths.coeff, currentY, colX + colWidths.coeff, currentY + rowHeight);
            colX += colWidths.coeff;

            // Carré de couleur
            const hex = matiere.couleur || '#1e40af';
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            doc.setFillColor(r, g, b);
            doc.roundedRect(colX + 5, currentY + 2, 10, 4, 1, 1, 'F');
            
            doc.setDrawColor(r * 0.8, g * 0.8, b * 0.8);
            doc.roundedRect(colX + 5, currentY + 2, 10, 4, 1, 1, 'S');

            // Bordure de ligne
            doc.setDrawColor(220, 220, 220);
            doc.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

            currentY += rowHeight;
        }
        
        // Bordure extérieure du tableau
        doc.setDrawColor(45, 45, 45);
        doc.setLineWidth(0.5);
        const tableHeight = (matieres.length * 7) + 8;
        doc.rect(margin, infoY + 15, contentWidth, tableHeight > pageHeight - infoY - 35 ? pageHeight - infoY - 35 : tableHeight);
        
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('Genere par Harchive - ' + dateStr, margin, pageHeight - 15);

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=matieres-' + classeNom.replace(/\s+/g, '-') + '.pdf'
            }
        });
    } catch (error) {
        console.error("Erreur lors de la generation du PDF:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
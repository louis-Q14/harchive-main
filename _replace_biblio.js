const fs = require('fs');
let c = fs.readFileSync('src/pages/BibliothequeNumerique.jsx', 'utf8');

// Find the bulk import dialog section
const bulkStart = c.indexOf('{/* Dialog Import en masse */}');
const bulkEndMarker = '</Dialog>\n\n        {/* Dialog Ajout/Modification */}';
const bulkEnd = c.indexOf(bulkEndMarker, bulkStart);

if (bulkStart === -1 || bulkEnd === -1) {
  console.log('Could not find bulk import dialog markers');
  console.log('bulkStart:', bulkStart, 'bulkEnd:', bulkEnd);
  // Try alternative search
  const lines = c.split('\n');
  for (let i = 580; i < 640; i++) {
    console.log(`L${i+1}: ${lines[i]}`);
  }
  process.exit(1);
}

const bulkOld = c.substring(bulkStart, bulkEnd + '</Dialog>'.length);

const bulkNew = `{/* Dialog Import en masse */}
        <DraggableDialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}
          title={<div style={CG}>
            <div className="text-base font-semibold text-white">Importer plusieurs livres</div>
            <div className="text-xs mt-0.5" style={{color: '#b0b0b0'}}>Importez plusieurs livres à partir d'un fichier CSV</div>
          </div>}
          maxWidth="max-w-md">
          <DraggableDialogBody>
            <div className="grid gap-4" style={CG}>
              <div className="space-y-1.5">
                <Label className="text-white text-xs font-medium" style={CG}>Fichier CSV</Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBulkImportFile(e.target.files?.[0] || null)}
                  style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}
                />
                <p className="text-xs mt-2" style={{color:'#999'}}>
                  Le fichier CSV doit contenir les colonnes : titre, auteur, description, categorie, isbn, annee_publication, editeur, langue, nombre_pages, couverture_url, fichier_pdf_url
                </p>
              </div>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkImportDialog(false); setBulkImportFile(null); }} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG}}>Annuler</Button>
            <Button onClick={handleBulkImport} disabled={!bulkImportFile || bulkImportMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
              {bulkImportMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Importer
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>`;

c = c.replace(bulkOld, bulkNew);

// Now find the Add/Edit dialog
const addStart = c.indexOf('{/* Dialog Ajout/Modification */}');
// Find the closing </Dialog> after it followed by end of component
const addSection = c.substring(addStart);
// Find the last </Dialog> in the remaining section
const dialogClosePattern = '        </Dialog>\n      </div>\n    </div>';
const addEndIdx = c.indexOf(dialogClosePattern, addStart);

if (addStart === -1 || addEndIdx === -1) {
  console.log('Could not find add/edit dialog markers');
  console.log('addStart:', addStart, 'addEndIdx:', addEndIdx);
  process.exit(1);
}

const addOld = c.substring(addStart, addEndIdx + '        </Dialog>'.length);

const addNew = `{/* Dialog Ajout/Modification */}
        <DraggableDialog open={showAddDialog || showEditDialog} onOpenChange={(open) => {
          if (!open) { setShowAddDialog(false); setShowEditDialog(false); setSelectedBook(null); resetForm(); }
        }}
          title={<div style={CG}>
            <div className="text-base font-semibold text-white">{showEditDialog ? "Modifier le livre" : "Ajouter un livre"}</div>
            <div className="text-xs mt-0.5" style={{color: '#b0b0b0'}}>Remplissez les informations du livre</div>
          </div>}
          maxWidth="max-w-2xl">
          <DraggableDialogBody>
            <div className="grid gap-4" style={CG}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
                  <Input value={formData.titre} onChange={(e) => setFormData({...formData, titre: e.target.value})} placeholder="Titre du livre" style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Auteur *</Label>
                  <Input value={formData.auteur} onChange={(e) => setFormData({...formData, auteur: e.target.value})} placeholder="Nom de l'auteur" style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Catégorie *</Label>
                  <Select value={formData.categorie} onValueChange={(val) => setFormData({...formData, categorie: val})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Roman", "Science", "Histoire", "Mathématiques", "Informatique", "Philosophie", "Littérature", "Droit", "Économie", "Autre"].map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Description du livre" rows={3} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>ISBN</Label>
                  <Input value={formData.isbn} onChange={(e) => setFormData({...formData, isbn: e.target.value})} placeholder="ISBN" style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Éditeur</Label>
                  <Input value={formData.editeur} onChange={(e) => setFormData({...formData, editeur: e.target.value})} placeholder="Maison d'édition" style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Année de publication</Label>
                  <Input type="number" value={formData.annee_publication} onChange={(e) => setFormData({...formData, annee_publication: parseInt(e.target.value)})} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Nombre de pages</Label>
                  <Input type="number" value={formData.nombre_pages} onChange={(e) => setFormData({...formData, nombre_pages: parseInt(e.target.value)})} placeholder="Nombre de pages" style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Langue</Label>
                  <Select value={formData.langue} onValueChange={(val) => setFormData({...formData, langue: val})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Français", "Anglais", "Espagnol", "Autre"].map(lang => (
                        <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Image de couverture</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'cover')} disabled={uploadingCover} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                    {uploadingCover && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  {formData.couverture_url && <img src={formData.couverture_url} alt="Aperçu" className="mt-2 h-32 object-cover rounded" />}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Fichier PDF *</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="file" accept=".pdf" onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'pdf')} disabled={uploadingPdf} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                    {uploadingPdf && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  {formData.fichier_pdf_url && <p className="text-sm text-green-400 mt-1">✓ Fichier PDF téléchargé</p>}
                </div>
              </div>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setShowEditDialog(false); setSelectedBook(null); resetForm(); }} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: '#e0e0e0', ...CG}}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={!formData.titre || !formData.auteur || !formData.categorie || createBookMutation.isPending || updateBookMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white" style={CG}>
              {(createBookMutation.isPending || updateBookMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {showEditDialog ? "Modifier" : "Ajouter"}
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>`;

c = c.replace(addOld, addNew);

fs.writeFileSync('src/pages/BibliothequeNumerique.jsx', c, 'utf8');
console.log('BibliothequeNumerique.jsx updated successfully');

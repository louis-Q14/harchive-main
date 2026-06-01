const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'BibliothequeNumerique.jsx');
let c = fs.readFileSync(filePath, 'utf8');
const lines = c.split('\n');

// Find the bulk import dialog - line numbers are 1-based
// Find line containing "Dialog Import en masse"
let bulkStartLine = -1;
let bulkEndLine = -1;
let addStartLine = -1;
let addEndLine = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Dialog Import en masse')) bulkStartLine = i;
  if (lines[i].includes('Dialog Ajout/Modification')) addStartLine = i;
}

console.log('Bulk import starts at line:', bulkStartLine + 1);
console.log('Add/Edit starts at line:', addStartLine + 1);

// Find end of bulk import dialog (</Dialog> before addStartLine)
for (let i = addStartLine - 1; i > bulkStartLine; i--) {
  if (lines[i].trim() === '</Dialog>') {
    bulkEndLine = i;
    break;
  }
}

// Find end of add/edit dialog (last </Dialog> in file)
for (let i = lines.length - 1; i > addStartLine; i--) {
  if (lines[i].trim() === '</Dialog>') {
    addEndLine = i;
    break;
  }
}

console.log('Bulk import ends at line:', bulkEndLine + 1);
console.log('Add/Edit ends at line:', addEndLine + 1);

if (bulkStartLine === -1 || bulkEndLine === -1 || addStartLine === -1 || addEndLine === -1) {
  console.error('Could not find all dialog markers');
  process.exit(1);
}

// Replace Add/Edit dialog FIRST (higher line numbers)
const addNewLines = `        {/* Dialog Ajout/Modification */}
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
                  <Label className="text-white text-xs font-medium" style={CG}>Cat\u00e9gorie *</Label>
                  <Select value={formData.categorie} onValueChange={(val) => setFormData({...formData, categorie: val})}>
                    <SelectTrigger style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Roman", "Science", "Histoire", "Math\u00e9matiques", "Informatique", "Philosophie", "Litt\u00e9rature", "Droit", "\u00c9conomie", "Autre"].map(cat => (
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
                  <Label className="text-white text-xs font-medium" style={CG}>\u00c9diteur</Label>
                  <Input value={formData.editeur} onChange={(e) => setFormData({...formData, editeur: e.target.value})} placeholder="Maison d'\u00e9dition" style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Ann\u00e9e de publication</Label>
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
                      {["Fran\u00e7ais", "Anglais", "Espagnol", "Autre"].map(lang => (
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
                  {formData.couverture_url && <img src={formData.couverture_url} alt="Aper\u00e7u" className="mt-2 h-32 object-cover rounded" />}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-white text-xs font-medium" style={CG}>Fichier PDF *</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="file" accept=".pdf" onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0], 'pdf')} disabled={uploadingPdf} style={{backgroundColor:'#2d2d2d', color:'#ffffff', borderColor:'#4d4d4d', ...CG}} />
                    {uploadingPdf && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  {formData.fichier_pdf_url && <p className="text-sm text-green-400 mt-1">\u2713 Fichier PDF t\u00e9l\u00e9charg\u00e9</p>}
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
        </DraggableDialog>`.split('\n');

// Replace from addStartLine to addEndLine (inclusive)
lines.splice(addStartLine, addEndLine - addStartLine + 1, ...addNewLines);

// Now replace bulk import dialog (line numbers haven't changed since we replaced after it)
const bulkNewLines = `        {/* Dialog Import en masse */}
        <DraggableDialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}
          title={<div style={CG}>
            <div className="text-base font-semibold text-white">Importer plusieurs livres</div>
            <div className="text-xs mt-0.5" style={{color: '#b0b0b0'}}>Importez plusieurs livres \u00e0 partir d'un fichier CSV</div>
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
        </DraggableDialog>`.split('\n');

lines.splice(bulkStartLine, bulkEndLine - bulkStartLine + 1, ...bulkNewLines);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('SUCCESS: BibliothequeNumerique.jsx updated');

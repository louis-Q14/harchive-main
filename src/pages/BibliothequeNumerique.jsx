import React, { useState, useEffect, useRef } from "react";
import { authService, dataService, uploadService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import {
  BookOpen, Plus, Search, Eye, Edit, Trash2, Loader2,
  Upload, X, Filter, Star, MessageSquare, Info, ExternalLink,
  FileText, GraduationCap, BookMarked, ChevronLeft, Maximize2, Minimize2
} from "lucide-react";

const TABS = [
  { id: 'bibliotheque', label: "Biblioth\u00e8que", icon: BookMarked },
  { id: 'travaux', label: 'Travaux & Full Textes', icon: GraduationCap },
  { id: 'lecteur', label: 'Lecture', icon: FileText },
];

const BOOK_CATEGORIES = ["Roman", "Science", "Histoire", "Math\u00e9matiques", "Informatique", "Philosophie", "Litt\u00e9rature", "Droit", "\u00c9conomie", "Ing\u00e9nierie", "Architecture", "G\u00e9nie Civil", "\u00c9lectricit\u00e9", "Plomberie", "Autre"];
const TRAVAIL_TYPES = ["M\u00e9moire", "Th\u00e8se", "Recherche", "Article", "Rapport de stage", "Projet de fin d'\u00e9tudes", "Publication scientifique", "Autre"];
const TRAVAIL_NIVEAUX = ["Licence (L1)", "Licence (L2)", "Licence (L3)", "Master (M1)", "Master (M2)", "Doctorat", "Professeur", "Autre"];

export default function BibliothequeNumerique() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bibliotheque');

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null, type: null });
  const contextMenuRef = useRef(null);

  const [showAddBookDialog, setShowAddBookDialog] = useState(false);
  const [showEditBookDialog, setShowEditBookDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(0);
  const [showTravailCommentsDialog, setShowTravailCommentsDialog] = useState(false);
  const [travailCommentText, setTravailCommentText] = useState("");
  const [travailCommentRating, setTravailCommentRating] = useState(0);
  const [bookFormData, setBookFormData] = useState({
    titre: "", auteur: "", description: "", categorie: "Roman", isbn: "",
    annee_publication: new Date().getFullYear(), editeur: "", langue: "Fran\u00e7ais",
    nombre_pages: "", couverture_url: "", fichier_pdf_url: "", disponible: true, tags: []
  });

  const [showAddTravailDialog, setShowAddTravailDialog] = useState(false);
  const [showEditTravailDialog, setShowEditTravailDialog] = useState(false);
  const [showTravailDetailsDialog, setShowTravailDetailsDialog] = useState(false);
  const [selectedTravail, setSelectedTravail] = useState(null);
  const [travailSearchQuery, setTravailSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("Tous");
  const [travailFormData, setTravailFormData] = useState({
    titre: "", auteur: "", type_travail: "M\u00e9moire", discipline: "", resume: "",
    mots_cles: "", annee: new Date().getFullYear(), etablissement: "",
    directeur_recherche: "", niveau: "", couverture_url: "", fichier_pdf_url: "", nombre_pages: ""
  });

  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfFullscreen, setPdfFullscreen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(p => ({ ...p, visible: false }));
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      document.addEventListener('contextmenu', handleClick);
      return () => { document.removeEventListener('click', handleClick); document.removeEventListener('contextmenu', handleClick); };
    }
  }, [contextMenu.visible]);

  const loadUser = async () => {
    try { const currentUser = await authService.getCurrentUser(); setUser(currentUser); }
    catch (error) { console.error("Erreur:", error); }
    finally { setLoading(false); }
  };

  const { data: books = [], isLoading: loadingBooks } = useQuery({
    queryKey: ['books'],
    queryFn: () => dataService.query('Livre', { orderBy: '-created_date', limit: 500 }),
    enabled: !!user
  });

  const { data: travaux = [], isLoading: loadingTravaux } = useQuery({
    queryKey: ['travaux'],
    queryFn: () => dataService.query('TravailAcademique', { orderBy: '-created_date', limit: 500 }),
    enabled: !!user
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['book-comments', selectedBook?.id],
    queryFn: () => dataService.query('CommentaireLivre', {
      filters: [{ livre_id: selectedBook.id }], orderBy: '-created_date', limit: 100
    }),
    enabled: !!selectedBook?.id && showCommentsDialog
  });

  const { data: travailComments = [], refetch: refetchTravailComments } = useQuery({
    queryKey: ['travail-comments', selectedTravail?.id],
    queryFn: () => dataService.query('CommentaireTravail', {
      filters: [{ travail_id: selectedTravail.id }], orderBy: '-created_date', limit: 100
    }),
    enabled: !!selectedTravail?.id && showTravailCommentsDialog
  });

  const createBookMutation = useMutation({
    mutationFn: (bookData) => {
      const clean = { ...bookData, created_by: user?.id };
      if (clean.nombre_pages === '' || clean.nombre_pages === null) delete clean.nombre_pages;
      else clean.nombre_pages = Number(clean.nombre_pages) || null;
      if (clean.annee_publication) clean.annee_publication = Number(clean.annee_publication);
      return dataService.create('Livre', clean);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['books'] }); setShowAddBookDialog(false); resetBookForm(); },
    onError: (err) => { console.error('Erreur:', err); alert("Erreur lors de la cr\u00e9ation du livre"); }
  });

  const updateBookMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('Livre', id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['books'] }); setShowEditBookDialog(false); setSelectedBook(null); resetBookForm(); },
    onError: (err) => { console.error('Erreur modification:', err); alert("Erreur lors de la modification du livre"); }
  });

  const deleteBookMutation = useMutation({
    mutationFn: (id) => dataService.delete('Livre', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] })
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (bks) => Promise.all(bks.map(b => dataService.create('Livre', b))),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['books'] }); setShowBulkImportDialog(false); setBulkImportFile(null); alert("Livres import\u00e9s avec succ\u00e8s !"); }
  });

  const addCommentMutation = useMutation({
    mutationFn: (data) => dataService.create('CommentaireLivre', data),
    onSuccess: () => { refetchComments(); setCommentText(""); setCommentRating(0); }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => dataService.delete('CommentaireLivre', id),
    onSuccess: () => refetchComments()
  });

  const addTravailCommentMutation = useMutation({
    mutationFn: (data) => dataService.create('CommentaireTravail', data),
    onSuccess: () => { refetchTravailComments(); setTravailCommentText(""); setTravailCommentRating(0); }
  });

  const deleteTravailCommentMutation = useMutation({
    mutationFn: (id) => dataService.delete('CommentaireTravail', id),
    onSuccess: () => refetchTravailComments()
  });

  const incrementViewsMutation = useMutation({
    mutationFn: ({ id, currentViews, entity }) => dataService.update(entity || 'Livre', id, { nombre_consultations: currentViews + 1 })
  });

  const createTravailMutation = useMutation({
    mutationFn: (data) => {
      const clean = { ...data, created_by: user?.id };
      if (clean.nombre_pages === '' || clean.nombre_pages === null) delete clean.nombre_pages;
      else clean.nombre_pages = Number(clean.nombre_pages) || null;
      if (clean.annee) clean.annee = Number(clean.annee);
      return dataService.create('TravailAcademique', clean);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['travaux'] }); setShowAddTravailDialog(false); resetTravailForm(); },
    onError: (err) => { console.error('Erreur:', err); alert("Erreur lors de la publication"); }
  });

  const updateTravailMutation = useMutation({
    mutationFn: ({ id, data }) => dataService.update('TravailAcademique', id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['travaux'] }); setShowEditTravailDialog(false); setSelectedTravail(null); resetTravailForm(); }
  });

  const deleteTravailMutation = useMutation({
    mutationFn: (id) => dataService.delete('TravailAcademique', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['travaux'] })
  });

  const resetBookForm = () => setBookFormData({
    titre: "", auteur: "", description: "", categorie: "Roman", isbn: "",
    annee_publication: new Date().getFullYear(), editeur: "", langue: "Fran\u00e7ais",
    nombre_pages: "", couverture_url: "", fichier_pdf_url: "", disponible: true, tags: []
  });

  const resetTravailForm = () => setTravailFormData({
    titre: "", auteur: "", type_travail: "M\u00e9moire", discipline: "", resume: "",
    mots_cles: "", annee: new Date().getFullYear(), etablissement: "",
    directeur_recherche: "", niveau: "", couverture_url: "", fichier_pdf_url: "", nombre_pages: ""
  });

  const handleBookFileUpload = async (file, type) => {
    type === 'cover' ? setUploadingCover(true) : setUploadingPdf(true);
    try {
      const result = await uploadService.uploadFile(file, 'livres');
      if (type === 'pdf') {
        setBookFormData(prev => ({
          ...prev, fichier_pdf_url: result.url,
          ...(result.thumbnailUrl && !prev.couverture_url ? { couverture_url: result.thumbnailUrl } : {})
        }));
      } else {
        setBookFormData(prev => ({ ...prev, couverture_url: result.url }));
      }
    } catch (error) { console.error("Erreur upload:", error); alert("Erreur lors de l'upload"); }
    finally { type === 'cover' ? setUploadingCover(false) : setUploadingPdf(false); }
  };

  const handleTravailFileUpload = async (file, type) => {
    type === 'cover' ? setUploadingCover(true) : setUploadingPdf(true);
    try {
      const result = await uploadService.uploadFile(file, 'travaux');
      if (type === 'pdf') {
        setTravailFormData(prev => ({
          ...prev, fichier_pdf_url: result.url,
          ...(result.thumbnailUrl && !prev.couverture_url ? { couverture_url: result.thumbnailUrl } : {})
        }));
      } else {
        setTravailFormData(prev => ({ ...prev, couverture_url: result.url }));
      }
    } catch (error) { console.error("Erreur upload:", error); alert("Erreur lors de l'upload"); }
    finally { type === 'cover' ? setUploadingCover(false) : setUploadingPdf(false); }
  };

  const handleBookSubmit = () => {
    if (showEditBookDialog && selectedBook) updateBookMutation.mutate({ id: selectedBook.id, data: bookFormData });
    else createBookMutation.mutate(bookFormData);
  };

  const handleTravailSubmit = () => {
    if (showEditTravailDialog && selectedTravail) updateTravailMutation.mutate({ id: selectedTravail.id, data: travailFormData });
    else createTravailMutation.mutate(travailFormData);
  };

  const handleEditBook = (book) => {
    setSelectedBook(book);
    setBookFormData({
      titre: book.titre, auteur: book.auteur, description: book.description || "", categorie: book.categorie,
      isbn: book.isbn || "", annee_publication: book.annee_publication || new Date().getFullYear(),
      editeur: book.editeur || "", langue: book.langue || "Fran\u00e7ais", nombre_pages: book.nombre_pages || "",
      couverture_url: book.couverture_url || "", fichier_pdf_url: book.fichier_pdf_url || "",
      disponible: book.disponible !== false, tags: book.tags || []
    });
    setShowEditBookDialog(true);
  };

  const handleEditTravail = (t) => {
    setSelectedTravail(t);
    setTravailFormData({
      titre: t.titre, auteur: t.auteur, type_travail: t.type_travail || "M\u00e9moire",
      discipline: t.discipline || "", resume: t.resume || "", mots_cles: t.mots_cles || "",
      annee: t.annee || new Date().getFullYear(), etablissement: t.etablissement || "",
      directeur_recherche: t.directeur_recherche || "", niveau: t.niveau || "",
      couverture_url: t.couverture_url || "", fichier_pdf_url: t.fichier_pdf_url || "",
      nombre_pages: t.nombre_pages || ""
    });
    setShowEditTravailDialog(true);
  };

  const openInReader = (url, title) => {
    if (!url) { alert("Aucun fichier PDF disponible"); return; }
    if (pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); }
    setPdfUrl(url);
    setPdfTitle(title);
    setPdfLoading(true);
    setActiveTab('lecteur');
    fetch("/api/doc-stream", {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: url })
    })
      .then(res => { if (!res.ok) throw new Error('Erreur ' + res.status); return res.arrayBuffer(); })
      .then(buffer => {
        const blobUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
        setPdfBlobUrl(blobUrl);
        setPdfLoading(false);
      })
      .catch(err => { console.error('Erreur chargement PDF:', err); setPdfLoading(false); alert("Impossible de charger le PDF"); });
  };

  const handleContextMenu = (e, item, type) => {
    e.preventDefault(); e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 320);
    setContextMenu({ visible: true, x, y, item, type });
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const userName = (user.prenom || '') + ' ' + (user.nom || '');
    addCommentMutation.mutate({
      livre_id: selectedBook.id, user_id: user.id,
      user_nom: userName.trim() || user.email,
      user_photo_url: user.photo_url || '', contenu: commentText.trim(), note: commentRating
    });
  };

  const handleAddTravailComment = () => {
    if (!travailCommentText.trim()) return;
    const userName = (user.prenom || '') + ' ' + (user.nom || '');
    addTravailCommentMutation.mutate({
      travail_id: selectedTravail.id, user_id: user.id,
      user_nom: userName.trim() || user.email,
      user_photo_url: user.photo_url || '', contenu: travailCommentText.trim(), note: travailCommentRating
    });
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile) { alert("Veuillez s\u00e9lectionner un fichier CSV"); return; }
    try {
      const text = await bulkImportFile.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { alert("Le fichier CSV est vide ou invalide"); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const bks = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const book = {}; headers.forEach((h, i) => { book[h] = values[i] || ''; });
        return { titre: book.titre || '', auteur: book.auteur || '', description: book.description || '',
          categorie: book.categorie || 'Autre', isbn: book.isbn || '',
          annee_publication: parseInt(book.annee_publication) || new Date().getFullYear(),
          editeur: book.editeur || '', langue: book.langue || "Fran\u00e7ais",
          nombre_pages: parseInt(book.nombre_pages) || 0, disponible: true };
      }).filter(b => b.titre && b.auteur);
      if (bks.length === 0) { alert("Aucun livre valide trouv\u00e9"); return; }
      bulkImportMutation.mutate(bks);
    } catch (error) { console.error("Erreur import:", error); alert("Erreur lors de l'import"); }
  };

  const categories = ["Toutes", ...new Set(books.map(b => b.categorie).filter(Boolean))];
  const filteredBooks = books.filter(book => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || book.titre?.toLowerCase().includes(q) || book.auteur?.toLowerCase().includes(q) || book.description?.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === "Toutes" || book.categorie === selectedCategory;
    return matchesSearch && matchesCategory && book.disponible !== false;
  });

  const travailTypes = ["Tous", ...new Set(travaux.map(t => t.type_travail).filter(Boolean))];
  const filteredTravaux = travaux.filter(t => {
    const q = travailSearchQuery.toLowerCase();
    const matchesSearch = !q || t.titre?.toLowerCase().includes(q) || t.auteur?.toLowerCase().includes(q) || t.resume?.toLowerCase().includes(q) || t.discipline?.toLowerCase().includes(q);
    const matchesType = selectedType === "Tous" || t.type_travail === selectedType;
    return matchesSearch && matchesType;
  });

  const allDocuments = [
    ...books.filter(b => b.fichier_pdf_url).map(b => ({ ...b, _type: 'livre' })),
    ...travaux.filter(t => t.fichier_pdf_url).map(t => ({ ...t, _type: 'travail' }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const isAdmin = user?.role_archive === 'admin_systeme' || user?.role_archive === 'super_admin';

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a2e' }}><Loader2 className="w-12 h-12 text-gray-400 animate-spin" /></div>;

  const tabCls = (active) => "flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-all relative " + (active ? 'text-cyan-400' : 'text-gray-400 hover:text-gray-200');
  const coverFallbackCls = (hasCover) => "w-full h-full flex-col items-center justify-center absolute inset-0 " + (hasCover ? 'hidden' : 'flex');

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: '#1a1a2e', ...CG }}>
      <div className="max-w-[1400px] mx-auto">

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3" style={CG}>
            <BookOpen className="w-7 h-7 text-cyan-400" /> {"Biblioth\u00e8que Num\u00e9rique"}
          </h1>
          <p className="text-gray-400 text-sm mt-1" style={CG}>{"Explorez notre collection de livres, travaux acad\u00e9miques et documents"}</p>
        </div>

        <div className="flex border-b mb-5" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={tabCls(isActive)}
                style={CG}>
                <Icon className="w-4 h-4" />
                {tab.label}
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400 rounded-t" />}
              </button>
            );
          })}
        </div>

        {activeTab === 'bibliotheque' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-3 flex-1">
                <div className="relative flex-1 max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input placeholder="Rechercher par titre, auteur, ISBN..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10"
                    style={{ backgroundColor: '#252540', color: '#fff', borderColor: '#3a3a5c', ...CG }} />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-44 h-10" style={{ backgroundColor: '#252540', color: '#fff', borderColor: '#3a3a5c', ...CG }}>
                    <Filter className="w-3.5 h-3.5 mr-1.5 text-gray-400" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <div className="flex gap-2 ml-3">
                  <Button onClick={() => setShowAddBookDialog(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white" style={CG}>
                    <Plus className="w-4 h-4 mr-2" /> Ajouter un livre
                  </Button>
                  <Button onClick={() => setShowBulkImportDialog(true)} variant="outline" style={{ borderColor: '#444', color: 'var(--ha-text-muted)', ...CG }}>
                    <Upload className="w-4 h-4 mr-2" /> Importer
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-4 text-sm text-gray-400 mb-4" style={CG}>
              <span><strong className="text-cyan-400">{books.length}</strong> livres disponibles</span>
              <span><strong className="text-green-400">{books.reduce((s, b) => s + (b.nombre_consultations || 0), 0)}</strong> consultations</span>
            </div>

            {loadingBooks ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-gray-400 animate-spin" /></div>
            ) : filteredBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <BookOpen className="w-16 h-16 text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg" style={CG}>{"Aucun livre trouv\u00e9"}</p>
                <p className="text-gray-500 text-sm" style={CG}>{isAdmin ? "Ajoutez votre premier livre" : "Revenez plus tard"}</p>
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {filteredBooks.map(book => (
                  <div key={book.id} className="group relative cursor-pointer flex flex-col"
                    onContextMenu={(e) => handleContextMenu(e, book, 'livre')}
                    onClick={() => { setSelectedBook(book); setShowDetailsDialog(true); }}>
                    <div className="relative overflow-hidden rounded-md shadow-lg" style={{ aspectRatio: '2/3', background: '#1a1a2e' }}>
                      {book.couverture_url ? (
                        <img src={book.couverture_url} alt={book.titre}
                          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                      ) : null}
                      <div className={coverFallbackCls(book.couverture_url)}
                        style={{ background: 'linear-gradient(135deg, #2a2a4a 0%, #1a1a3a 100%)' }}>
                        <BookOpen className="w-10 h-10 text-gray-500 mb-2" />
                        <p className="text-[11px] text-gray-400 text-center px-3 leading-tight font-medium" style={CG}>{book.titre}</p>
                      </div>
                    </div>
                    <div className="mt-1.5 px-0.5">
                      <p className="text-white text-xs font-semibold leading-tight truncate" style={CG} title={book.titre}>{book.titre}</p>
                      <p className="text-gray-400 text-[10px] truncate mt-0.5" style={CG}>{book.auteur}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'travaux' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-3 flex-1">
                <div className="relative flex-1 max-w-xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input placeholder={"Rechercher un m\u00e9moire, th\u00e8se, article..."} value={travailSearchQuery}
                    onChange={(e) => setTravailSearchQuery(e.target.value)} className="pl-10 h-10"
                    style={{ backgroundColor: '#252540', color: '#fff', borderColor: '#3a3a5c', ...CG }} />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-52 h-10" style={{ backgroundColor: '#252540', color: '#fff', borderColor: '#3a3a5c', ...CG }}>
                    <Filter className="w-3.5 h-3.5 mr-1.5 text-gray-400" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>{travailTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={() => setShowAddTravailDialog(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white ml-3" style={CG}>
                <Plus className="w-4 h-4 mr-2" /> Publier un travail
              </Button>
            </div>
            <div className="flex gap-4 text-sm text-gray-400 mb-4" style={CG}>
              <span><strong className="text-emerald-400">{travaux.length}</strong> {"travaux publi\u00e9s"}</span>
              <span><strong className="text-green-400">{travaux.reduce((s, t) => s + (t.nombre_consultations || 0), 0)}</strong> consultations</span>
            </div>

            {loadingTravaux ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-gray-400 animate-spin" /></div>
            ) : filteredTravaux.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <GraduationCap className="w-16 h-16 text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg" style={CG}>{"Aucun travail publi\u00e9"}</p>
                <p className="text-gray-500 text-sm" style={CG}>{"Publiez votre m\u00e9moire, th\u00e8se ou recherche pour la communaut\u00e9"}</p>
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {filteredTravaux.map(travail => (
                  <div key={travail.id} className="group rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-1 hover:ring-emerald-500/40"
                    style={{ background: '#252540', border: '1px solid rgba(255,255,255,0.06)' }}
                    onContextMenu={(e) => handleContextMenu(e, travail, 'travail')}
                    onClick={() => { setSelectedTravail(travail); setShowTravailDetailsDialog(true); }}>
                    <div className="flex">
                      <div className="flex-shrink-0 w-24 h-32 relative overflow-hidden">
                        {travail.couverture_url ? (
                          <img src={travail.couverture_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e3a2e 0%, #1a2e3a 100%)' }}>
                            <FileText className="w-8 h-8 text-emerald-500/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-3 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-sm font-semibold truncate" style={CG}>{travail.titre}</p>
                            <p className="text-gray-400 text-xs mt-0.5" style={CG}>{travail.auteur}</p>
                          </div>
                          <Badge className="text-[9px] flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none' }}>
                            {travail.type_travail}
                          </Badge>
                        </div>
                        <p className="text-gray-500 text-[11px] mt-1.5 line-clamp-2 leading-relaxed" style={CG}>
                          {travail.resume || "Pas de r\u00e9sum\u00e9 disponible"}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500" style={CG}>
                          {travail.discipline && <span>{travail.discipline}</span>}
                          {travail.annee && <span>{travail.annee}</span>}
                          {travail.niveau && <span className="text-emerald-400/70">{travail.niveau}</span>}
                          <span className="ml-auto flex items-center gap-1"><Eye className="w-3 h-3" /> {travail.nombre_consultations || 0}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={(e) => { e.stopPropagation(); incrementViewsMutation.mutate({ id: travail.id, currentViews: travail.nombre_consultations || 0, entity: 'TravailAcademique' }); openInReader(travail.fichier_pdf_url, travail.titre); }}
                            className="px-3 py-1 rounded text-[11px] font-semibold text-white transition-colors"
                            style={{ background: 'rgba(16,185,129,0.3)', ...CG }}>
                            <Eye className="w-3 h-3 inline mr-1" /> Consulter
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedTravail(travail); setShowTravailCommentsDialog(true); }}
                            className="px-3 py-1 rounded text-[11px] font-semibold text-gray-300 transition-colors hover:text-white"
                            style={{ background: 'rgba(255,255,255,0.08)', ...CG }}>
                            <MessageSquare className="w-3 h-3 inline mr-1" /> Avis
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'lecteur' && (
          <div>
            {pdfUrl ? (
              <div className={pdfFullscreen ? "fixed inset-0 z-[100] flex flex-col" : "flex flex-col"} style={pdfFullscreen ? { background: '#111' } : {}}>
                <div className="flex items-center justify-between px-4 py-2 rounded-t-lg" style={{ background: '#1e1e3a', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); setPdfUrl(null); setPdfTitle(""); setPdfFullscreen(false); }}
                      className="text-gray-400 hover:text-white transition-colors p-1">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-white text-sm font-semibold truncate" style={CG}>{pdfTitle}</span>
                  </div>
                  <button onClick={() => setPdfFullscreen(!pdfFullscreen)}
                    className="text-gray-400 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10">
                    {pdfFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
                <div className={pdfFullscreen ? "flex-1" : ""} style={pdfFullscreen ? {} : { height: 'calc(100vh - 240px)' }}>
                  {pdfLoading ? (
                    <div className="w-full h-full flex items-center justify-center rounded-b-lg" style={{ border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', background: '#333' }}>
                      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                  ) : pdfBlobUrl ? (
                    <iframe
                      src={pdfBlobUrl + "#toolbar=0&navpanes=0&scrollbar=1"}
                      className="w-full h-full rounded-b-lg"
                      style={{ border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none', background: '#333' }}
                      title={pdfTitle}
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-center py-8 mb-6">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-300 text-lg font-semibold" style={CG}>{"Lecture"}</p>
                  <p className="text-gray-500 text-sm mt-1" style={CG}>{"S\u00e9lectionnez un document ci-dessous pour le consulter en ligne"}</p>
                </div>
                {allDocuments.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-10" style={CG}>Aucun document disponible</p>
                ) : (
                  <div className="space-y-2">
                    {allDocuments.map(doc => (
                      <div key={doc._type + '-' + doc.id}
                        className="flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all hover:ring-1 hover:ring-cyan-500/30"
                        style={{ background: '#252540', border: '1px solid rgba(255,255,255,0.06)' }}
                        onClick={() => { incrementViewsMutation.mutate({ id: doc.id, currentViews: doc.nombre_consultations || 0, entity: doc._type === 'livre' ? 'Livre' : 'TravailAcademique' }); openInReader(doc.fichier_pdf_url, doc.titre); }}>
                        <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0">
                          {doc.couverture_url ? (
                            <img src={doc.couverture_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: doc._type === 'livre' ? '#2a2a4a' : '#1e3a2e' }}>
                              {doc._type === 'livre' ? <BookOpen className="w-4 h-4 text-gray-500" /> : <FileText className="w-4 h-4 text-emerald-500/50" />}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate" style={CG}>{doc.titre}</p>
                          <p className="text-gray-400 text-xs" style={CG}>{doc.auteur}</p>
                        </div>
                        <Badge className="text-[9px]" style={{
                          background: doc._type === 'livre' ? 'rgba(6,182,212,0.15)' : 'rgba(16,185,129,0.15)',
                          color: doc._type === 'livre' ? '#06b6d4' : '#10b981', border: 'none'
                        }}>
                          {doc._type === 'livre' ? 'Livre' : (doc.type_travail || 'Travail')}
                        </Badge>
                        <span className="text-gray-500 text-[10px] flex items-center gap-1" style={CG}>
                          <Eye className="w-3 h-3" /> {doc.nombre_consultations || 0}
                        </span>
                        <Button size="sm" className="bg-cyan-600/80 hover:bg-cyan-700 text-white text-xs" style={CG}>
                          <Eye className="w-3 h-3 mr-1" /> Lire
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {contextMenu.visible && (
          <div ref={contextMenuRef} className="fixed rounded-lg shadow-2xl border py-1 z-[999]"
            style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 200,
              background: 'rgba(30,30,50,0.97)', backdropFilter: 'blur(20px)',
              borderColor: 'rgba(255,255,255,0.12)', ...CG }}>
            <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-white text-xs font-semibold truncate" style={CG}>{contextMenu.item?.titre}</p>
              <p className="text-gray-400 text-[10px]" style={CG}>{contextMenu.item?.auteur}</p>
            </div>
            {[
              { icon: <Eye className="w-3.5 h-3.5" />, label: 'Consulter en ligne', color: '#00d4d4', action: () => { incrementViewsMutation.mutate({ id: contextMenu.item.id, currentViews: contextMenu.item.nombre_consultations || 0, entity: contextMenu.type === 'livre' ? 'Livre' : 'TravailAcademique' }); openInReader(contextMenu.item.fichier_pdf_url, contextMenu.item.titre); } },
              ...(contextMenu.type === 'livre' ? [
                { icon: <Info className="w-3.5 h-3.5" />, label: "D\u00e9tails", color: '#a78bfa', action: () => { setSelectedBook(contextMenu.item); setShowDetailsDialog(true); } },
                { icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Commentaires', color: '#f59e0b', action: () => { setSelectedBook(contextMenu.item); setShowCommentsDialog(true); } },
              ] : [
                { icon: <Info className="w-3.5 h-3.5" />, label: "D\u00e9tails", color: '#a78bfa', action: () => { setSelectedTravail(contextMenu.item); setShowTravailDetailsDialog(true); } },
                { icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Commentaires', color: '#f59e0b', action: () => { setSelectedTravail(contextMenu.item); setShowTravailCommentsDialog(true); } },
              ]),
              { icon: <Eye className="w-3.5 h-3.5" />, label: (contextMenu.item?.nombre_consultations || 0) + ' consultations', color: '#9ca3af', action: null },
              ...(isAdmin || contextMenu.item?.created_by === user?.id ? [
                { icon: <Edit className="w-3.5 h-3.5" />, label: 'Modifier', color: '#4ade80', action: () => contextMenu.type === 'livre' ? handleEditBook(contextMenu.item) : handleEditTravail(contextMenu.item) },
                { icon: <Trash2 className="w-3.5 h-3.5" />, label: 'Supprimer', color: '#ef4444', action: () => {
                  if (confirm("Supprimer cet \u00e9l\u00e9ment ?")) {
                    contextMenu.type === 'livre' ? deleteBookMutation.mutate(contextMenu.item.id) : deleteTravailMutation.mutate(contextMenu.item.id);
                  }
                } },
              ] : [])
            ].map((item, i) => (
              <button key={i} className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
                style={{ color: item.color, ...CG }} onClick={item.action || undefined} disabled={!item.action}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        )}

        <DraggableDialog open={showDetailsDialog}
          onOpenChange={(o) => { if (!o) { setShowDetailsDialog(false); setSelectedBook(null); } }}
          title={<div style={CG}><div className="text-sm font-semibold text-white">{"D\u00e9tails du livre"}</div></div>}
          maxWidth="max-w-2xl" resizable={false}>
          {selectedBook && (
            <DraggableDialogBody>
              <div className="flex gap-5" style={CG}>
                <div className="flex-shrink-0">
                  {selectedBook.couverture_url ? (
                    <img src={selectedBook.couverture_url} alt={selectedBook.titre}
                      className="rounded-lg shadow-lg object-cover" style={{ width: 180, height: 260 }} />
                  ) : (
                    <div className="rounded-lg flex items-center justify-center" style={{ width: 180, height: 260, background: '#252540' }}>
                      <BookOpen className="w-12 h-12 text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white mb-1" style={CG}>{selectedBook.titre}</h2>
                  <p className="text-cyan-400 text-sm mb-3" style={CG}>{selectedBook.auteur}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button size="sm" onClick={() => { incrementViewsMutation.mutate({ id: selectedBook.id, currentViews: selectedBook.nombre_consultations || 0, entity: 'Livre' }); openInReader(selectedBook.fichier_pdf_url, selectedBook.titre); setShowDetailsDialog(false); }}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs" style={CG}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Consulter
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowDetailsDialog(false); setShowCommentsDialog(true); }}
                      style={{ borderColor: 'var(--ha-border)', color: 'var(--ha-text-muted)', ...CG }} className="text-xs">
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Commentaires
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs" style={CG}>
                    {[
                      ["Cat\u00e9gorie", selectedBook.categorie], ["Ann\u00e9e", selectedBook.annee_publication],
                      ['Langue', selectedBook.langue], ['Pages', selectedBook.nombre_pages],
                      ["\u00c9diteur", selectedBook.editeur], ['ISBN', selectedBook.isbn],
                      ['Consultations', selectedBook.nombre_consultations || 0],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="flex justify-between py-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <span className="text-gray-400">{label}:</span>
                        <span className="text-white font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                  {selectedBook.description && (
                    <div className="mt-4">
                      <p className="text-gray-400 text-[11px] uppercase tracking-wider mb-1" style={CG}>Description</p>
                      <p className="text-gray-300 text-xs leading-relaxed" style={CG}>{selectedBook.description}</p>
                    </div>
                  )}
                  {selectedBook.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(Array.isArray(selectedBook.tags) ? selectedBook.tags : []).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DraggableDialogBody>
          )}
        </DraggableDialog>

        <DraggableDialog open={showTravailDetailsDialog}
          onOpenChange={(o) => { if (!o) { setShowTravailDetailsDialog(false); setSelectedTravail(null); } }}
          title={<div style={CG}><div className="text-sm font-semibold text-white">{"D\u00e9tails du travail"}</div></div>}
          maxWidth="max-w-2xl" resizable={false}>
          {selectedTravail && (
            <DraggableDialogBody>
              <div className="flex gap-5" style={CG}>
                <div className="flex-shrink-0">
                  {selectedTravail.couverture_url ? (
                    <img src={selectedTravail.couverture_url} alt={selectedTravail.titre}
                      className="rounded-lg shadow-lg object-cover" style={{ width: 180, height: 260 }} />
                  ) : (
                    <div className="rounded-lg flex items-center justify-center" style={{ width: 180, height: 260, background: '#1e3a2e' }}>
                      <FileText className="w-12 h-12 text-emerald-500/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white mb-1" style={CG}>{selectedTravail.titre}</h2>
                  <p className="text-emerald-400 text-sm mb-1" style={CG}>{selectedTravail.auteur}</p>
                  <div className="flex gap-2 mb-3">
                    <Badge style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none' }} className="text-[10px]">{selectedTravail.type_travail}</Badge>
                    {selectedTravail.niveau && <Badge style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: 'none' }} className="text-[10px]">{selectedTravail.niveau}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button size="sm" onClick={() => { incrementViewsMutation.mutate({ id: selectedTravail.id, currentViews: selectedTravail.nombre_consultations || 0, entity: 'TravailAcademique' }); openInReader(selectedTravail.fichier_pdf_url, selectedTravail.titre); setShowTravailDetailsDialog(false); }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs" style={CG}>
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> Consulter
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowTravailDetailsDialog(false); setShowTravailCommentsDialog(true); }}
                      style={{ borderColor: 'var(--ha-border)', color: 'var(--ha-text-muted)', ...CG }} className="text-xs">
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Commentaires
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs" style={CG}>
                    {[
                      ['Discipline', selectedTravail.discipline], ["Ann\u00e9e", selectedTravail.annee],
                      ["\u00c9tablissement", selectedTravail.etablissement], ['Directeur', selectedTravail.directeur_recherche],
                      ['Pages', selectedTravail.nombre_pages], ['Consultations', selectedTravail.nombre_consultations || 0],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="flex justify-between py-1 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <span className="text-gray-400">{label}:</span>
                        <span className="text-white font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                  {selectedTravail.resume && (
                    <div className="mt-4">
                      <p className="text-gray-400 text-[11px] uppercase tracking-wider mb-1" style={CG}>{"R\u00e9sum\u00e9"}</p>
                      <p className="text-gray-300 text-xs leading-relaxed" style={CG}>{selectedTravail.resume}</p>
                    </div>
                  )}
                  {selectedTravail.mots_cles && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(typeof selectedTravail.mots_cles === 'string' ? selectedTravail.mots_cles.split(',') : []).map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{kw.trim()}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DraggableDialogBody>
          )}
        </DraggableDialog>

        <DraggableDialog open={showCommentsDialog}
          onOpenChange={(o) => { if (!o) { setShowCommentsDialog(false); setSelectedBook(null); setCommentText(""); setCommentRating(0); } }}
          title={<div style={CG}>
            <div className="text-sm font-semibold text-white">Commentaires & Avis</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{selectedBook?.titre}</div>
          </div>}
          maxWidth="max-w-lg" resizable={false}>
          <DraggableDialogBody>
            <div style={CG}>
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400 text-xs" style={CG}>Votre note :</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => setCommentRating(s)} className="p-0.5">
                        <Star className="w-4 h-4" style={{ color: s <= commentRating ? '#f59e0b' : '#555', fill: s <= commentRating ? '#f59e0b' : 'none' }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Partagez votre avis sur ce livre..." rows={2} className="flex-1 resize-none text-xs"
                    style={{ backgroundColor: '#1e1e3a', color: '#fff', borderColor: '#3a3a5c', ...CG }} />
                  <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim() || addCommentMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white self-end" style={CG}>
                    {addCommentMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Envoyer"}
                  </Button>
                </div>
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-center text-gray-500 text-xs py-6" style={CG}>Aucun commentaire pour l'instant. Soyez le premier !</p>
                ) : comments.map(c => (
                  <div key={c.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {c.user_photo_url ? (
                          <img src={c.user_photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-cyan-900 flex items-center justify-center text-[10px] text-cyan-300 font-bold">
                            {(c.user_nom || '?')[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white text-xs font-medium" style={CG}>{c.user_nom || 'Anonyme'}</p>
                          <p className="text-gray-500 text-[10px]">{new Date(c.created_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {c.note > 0 && (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className="w-3 h-3" style={{ color: s <= c.note ? '#f59e0b' : '#444', fill: s <= c.note ? '#f59e0b' : 'none' }} />
                            ))}
                          </div>
                        )}
                        {(c.user_id === user?.id || isAdmin) && (
                          <button onClick={() => deleteCommentMutation.mutate(c.id)} className="ml-2 text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed" style={CG}>{c.contenu}</p>
                  </div>
                ))}
              </div>
            </div>
          </DraggableDialogBody>
        </DraggableDialog>

        <DraggableDialog open={showTravailCommentsDialog}
          onOpenChange={(o) => { if (!o) { setShowTravailCommentsDialog(false); setSelectedTravail(null); setTravailCommentText(""); setTravailCommentRating(0); } }}
          title={<div style={CG}>
            <div className="text-sm font-semibold text-white">Commentaires & Avis</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{selectedTravail?.titre}</div>
          </div>}
          maxWidth="max-w-lg" resizable={false}>
          <DraggableDialogBody>
            <div style={CG}>
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400 text-xs" style={CG}>Votre note :</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => setTravailCommentRating(s)} className="p-0.5">
                        <Star className="w-4 h-4" style={{ color: s <= travailCommentRating ? '#f59e0b' : '#555', fill: s <= travailCommentRating ? '#f59e0b' : 'none' }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Textarea value={travailCommentText} onChange={(e) => setTravailCommentText(e.target.value)}
                    placeholder="Partagez votre avis sur ce travail..." rows={2} className="flex-1 resize-none text-xs"
                    style={{ backgroundColor: '#1e1e3a', color: '#fff', borderColor: '#3a3a5c', ...CG }} />
                  <Button size="sm" onClick={handleAddTravailComment} disabled={!travailCommentText.trim() || addTravailCommentMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white self-end" style={CG}>
                    {addTravailCommentMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Envoyer"}
                  </Button>
                </div>
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {travailComments.length === 0 ? (
                  <p className="text-center text-gray-500 text-xs py-6" style={CG}>{"Aucun commentaire pour l'instant. Soyez le premier !"}</p>
                ) : travailComments.map(c => (
                  <div key={c.id} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {c.user_photo_url ? (
                          <img src={c.user_photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-emerald-900 flex items-center justify-center text-[10px] text-emerald-300 font-bold">
                            {(c.user_nom || '?')[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white text-xs font-medium" style={CG}>{c.user_nom || 'Anonyme'}</p>
                          <p className="text-gray-500 text-[10px]">{new Date(c.created_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {c.note > 0 && (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className="w-3 h-3" style={{ color: s <= c.note ? '#f59e0b' : '#444', fill: s <= c.note ? '#f59e0b' : 'none' }} />
                            ))}
                          </div>
                        )}
                        {(c.user_id === user?.id || isAdmin) && (
                          <button onClick={() => deleteTravailCommentMutation.mutate(c.id)} className="ml-2 text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed" style={CG}>{c.contenu}</p>
                  </div>
                ))}
              </div>
            </div>
          </DraggableDialogBody>
        </DraggableDialog>

        <DraggableDialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}
          title={<div style={{ ...CG, fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Importer plusieurs livres</div>}
          maxWidth="max-w-md" resizable={false}>
          <DraggableDialogBody>
            <div className="space-y-4">
              <Label className="text-white text-xs font-medium" style={CG}>Fichier CSV</Label>
              <Input type="file" accept=".csv" onChange={(e) => setBulkImportFile(e.target.files?.[0] || null)}
                style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
              <p className="text-xs text-gray-500" style={CG}>Colonnes : titre, auteur, description, categorie, isbn, annee_publication, editeur, langue, nombre_pages</p>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="outline" onClick={() => { setShowBulkImportDialog(false); setBulkImportFile(null); }}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG }}>Annuler</Button>
            <Button onClick={handleBulkImport} disabled={!bulkImportFile || bulkImportMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700 text-white" style={CG}>
              {bulkImportMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Importer
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>

        <DraggableDialog open={showAddBookDialog || showEditBookDialog}
          onOpenChange={(open) => { if (!open) { setShowAddBookDialog(false); setShowEditBookDialog(false); setSelectedBook(null); resetBookForm(); } }}
          title={<div style={CG}>
            <div className="text-sm font-semibold text-white">{showEditBookDialog ? "Modifier le livre" : "Ajouter un livre"}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ha-text-muted)' }}>Remplissez les informations du livre</div>
          </div>}
          maxWidth="max-w-2xl" resizable={false}>
          <DraggableDialogBody>
            <div className="grid gap-3" style={CG}>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
                  <Input value={bookFormData.titre} onChange={(e) => setBookFormData({ ...bookFormData, titre: e.target.value })}
                    placeholder="Titre du livre" style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Auteur *</Label>
                  <Input value={bookFormData.auteur} onChange={(e) => setBookFormData({ ...bookFormData, auteur: e.target.value })}
                    placeholder="Nom de l'auteur" style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>{"Cat\u00e9gorie *"}</Label>
                  <Select value={bookFormData.categorie} onValueChange={(val) => setBookFormData({ ...bookFormData, categorie: val })}>
                    <SelectTrigger style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }}><SelectValue /></SelectTrigger>
                    <SelectContent>{BOOK_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Description</Label>
                  <Textarea value={bookFormData.description} onChange={(e) => setBookFormData({ ...bookFormData, description: e.target.value })}
                    placeholder="Description du livre" rows={3} className="resize-none"
                    style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>ISBN</Label>
                  <Input value={bookFormData.isbn} onChange={(e) => setBookFormData({ ...bookFormData, isbn: e.target.value })}
                    placeholder="ISBN" style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>{"\u00c9diteur"}</Label>
                  <Input value={bookFormData.editeur} onChange={(e) => setBookFormData({ ...bookFormData, editeur: e.target.value })}
                    placeholder={"Maison d'\u00e9dition"} style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>{"Ann\u00e9e"}</Label>
                  <Input type="number" value={bookFormData.annee_publication}
                    onChange={(e) => setBookFormData({ ...bookFormData, annee_publication: parseInt(e.target.value) })}
                    style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Pages</Label>
                  <Input type="number" value={bookFormData.nombre_pages}
                    onChange={(e) => setBookFormData({ ...bookFormData, nombre_pages: parseInt(e.target.value) })}
                    placeholder="Pages" style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Langue</Label>
                  <Select value={bookFormData.langue} onValueChange={(val) => setBookFormData({ ...bookFormData, langue: val })}>
                    <SelectTrigger style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }}><SelectValue /></SelectTrigger>
                    <SelectContent>{["Fran\u00e7ais", "Anglais", "Espagnol", "Autre"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Image de couverture</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handleBookFileUpload(e.target.files[0], 'cover')}
                      disabled={uploadingCover} style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                    {uploadingCover && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                  </div>
                  {bookFormData.couverture_url && <img src={bookFormData.couverture_url} alt="Apercu" className="mt-2 h-28 object-cover rounded" />}
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Fichier PDF *</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="file" accept=".pdf" onChange={(e) => e.target.files[0] && handleBookFileUpload(e.target.files[0], 'pdf')}
                      disabled={uploadingPdf} style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                    {uploadingPdf && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                  </div>
                  {bookFormData.fichier_pdf_url && <p className="text-xs text-green-400 mt-1">{"\u2713 Fichier PDF upload\u00e9"}</p>}
                </div>
              </div>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="outline" onClick={() => { setShowAddBookDialog(false); setShowEditBookDialog(false); setSelectedBook(null); resetBookForm(); }}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG }}>Annuler</Button>
            <Button onClick={handleBookSubmit}
              disabled={!bookFormData.titre || !bookFormData.auteur || !bookFormData.categorie || createBookMutation.isPending || updateBookMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700 text-white" style={CG}>
              {(createBookMutation.isPending || updateBookMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {showEditBookDialog ? "Modifier" : "Ajouter"}
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>

        <DraggableDialog open={showAddTravailDialog || showEditTravailDialog}
          onOpenChange={(open) => { if (!open) { setShowAddTravailDialog(false); setShowEditTravailDialog(false); setSelectedTravail(null); resetTravailForm(); } }}
          title={<div style={CG}>
            <div className="text-sm font-semibold text-white">{showEditTravailDialog ? "Modifier le travail" : "Publier un travail acad\u00e9mique"}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--ha-text-muted)' }}>{"M\u00e9moire, th\u00e8se, recherche, article..."}</div>
          </div>}
          maxWidth="max-w-2xl" resizable={false}>
          <DraggableDialogBody>
            <div className="grid gap-3" style={CG}>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Titre *</Label>
                  <Input value={travailFormData.titre} onChange={(e) => setTravailFormData({ ...travailFormData, titre: e.target.value })}
                    placeholder="Titre du travail" style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Auteur *</Label>
                  <Input value={travailFormData.auteur} onChange={(e) => setTravailFormData({ ...travailFormData, auteur: e.target.value })}
                    placeholder="Nom de l'auteur" style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Type de travail *</Label>
                  <Select value={travailFormData.type_travail} onValueChange={(val) => setTravailFormData({ ...travailFormData, type_travail: val })}>
                    <SelectTrigger style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }}><SelectValue /></SelectTrigger>
                    <SelectContent>{TRAVAIL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Discipline</Label>
                  <Input value={travailFormData.discipline} onChange={(e) => setTravailFormData({ ...travailFormData, discipline: e.target.value })}
                    placeholder="ex: Informatique, Droit..." style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Niveau</Label>
                  <Select value={travailFormData.niveau} onValueChange={(val) => setTravailFormData({ ...travailFormData, niveau: val })}>
                    <SelectTrigger style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }}><SelectValue /></SelectTrigger>
                    <SelectContent>{TRAVAIL_NIVEAUX.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>{"R\u00e9sum\u00e9"}</Label>
                  <Textarea value={travailFormData.resume} onChange={(e) => setTravailFormData({ ...travailFormData, resume: e.target.value })}
                    placeholder={"R\u00e9sum\u00e9 du travail..."} rows={3} className="resize-none"
                    style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>{"\u00c9tablissement"}</Label>
                  <Input value={travailFormData.etablissement} onChange={(e) => setTravailFormData({ ...travailFormData, etablissement: e.target.value })}
                    placeholder={"Universit\u00e9 / \u00c9cole"} style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Directeur de recherche</Label>
                  <Input value={travailFormData.directeur_recherche} onChange={(e) => setTravailFormData({ ...travailFormData, directeur_recherche: e.target.value })}
                    placeholder="Nom du directeur" style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>{"Ann\u00e9e"}</Label>
                  <Input type="number" value={travailFormData.annee}
                    onChange={(e) => setTravailFormData({ ...travailFormData, annee: parseInt(e.target.value) })}
                    style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Pages</Label>
                  <Input type="number" value={travailFormData.nombre_pages}
                    onChange={(e) => setTravailFormData({ ...travailFormData, nombre_pages: parseInt(e.target.value) })}
                    placeholder="Pages" style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>{"Mots-cl\u00e9s"}</Label>
                  <Input value={travailFormData.mots_cles} onChange={(e) => setTravailFormData({ ...travailFormData, mots_cles: e.target.value })}
                    placeholder={"S\u00e9parez par des virgules"} style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Image de couverture</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files[0] && handleTravailFileUpload(e.target.files[0], 'cover')}
                      disabled={uploadingCover} style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                    {uploadingCover && <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />}
                  </div>
                  {travailFormData.couverture_url && <img src={travailFormData.couverture_url} alt="Apercu" className="mt-2 h-28 object-cover rounded" />}
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-white text-xs font-medium" style={CG}>Fichier PDF *</Label>
                  <div className="flex gap-2 items-center">
                    <Input type="file" accept=".pdf" onChange={(e) => e.target.files[0] && handleTravailFileUpload(e.target.files[0], 'pdf')}
                      disabled={uploadingPdf} style={{ backgroundColor: 'var(--ha-surface2)', color: 'var(--ha-text)', borderColor: 'var(--ha-border)', ...CG }} />
                    {uploadingPdf && <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />}
                  </div>
                  {travailFormData.fichier_pdf_url && <p className="text-xs text-green-400 mt-1">{"\u2713 Fichier PDF upload\u00e9"}</p>}
                </div>
              </div>
            </div>
          </DraggableDialogBody>
          <DraggableDialogFooter>
            <Button variant="outline" onClick={() => { setShowAddTravailDialog(false); setShowEditTravailDialog(false); setSelectedTravail(null); resetTravailForm(); }}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG }}>Annuler</Button>
            <Button onClick={handleTravailSubmit}
              disabled={!travailFormData.titre || !travailFormData.auteur || createTravailMutation.isPending || updateTravailMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white" style={CG}>
              {(createTravailMutation.isPending || updateTravailMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {showEditTravailDialog ? "Modifier" : "Publier"}
            </Button>
          </DraggableDialogFooter>
        </DraggableDialog>

      </div>
    </div>
  );
}

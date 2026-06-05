import React, { useState, useEffect } from "react";
import { authService, dataService, functionService } from "@/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Download,
  Link2,
  Copy,
  Trash2,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  Loader2,
  Search,
  Eye,
  EyeOff,
  CheckCircle,
  FolderOpen
} from "lucide-react";
import { DraggableDialog, DraggableDialogBody, DraggableDialogFooter } from "@/components/ui/DraggableDialog";
const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { toast } from "sonner";

export default function PartagesFichiers() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [foundFile, setFoundFile] = useState(null);
  const [searching, setSearching] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const { data: mesFichiers = [], isLoading: loadingFichiers } = useQuery({
    queryKey: ['mes-fichiers-partages', user?.email],
    queryFn: () => dataService.query('FichierPartage', { filters: [{ created_by: user.email }] }),
    enabled: !!user?.email
  });

  const createFichierMutation = useMutation({
    mutationFn: (data) => dataService.create('FichierPartage', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-fichiers-partages'] });
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDescription("");
      toast.success("Fichier uploadé avec succès!");
    }
  });

  const deleteFichierMutation = useMutation({
    mutationFn: (id) => dataService.delete('FichierPartage', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-fichiers-partages'] });
      toast.success("Fichier supprimé");
    }
  });

  const toggleActifMutation = useMutation({
    mutationFn: ({ id, actif }) => dataService.update('FichierPartage', id, { actif }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-fichiers-partages'] });
    }
  });

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      await createFichierMutation.mutateAsync({
        nom: selectedFile.name,
        fichier_url: file_url,
        taille: selectedFile.size,
        type_fichier: selectedFile.type,
        code_partage: generateCode(),
        description: description,
        telechargements: 0,
        actif: true
      });
    } catch (error) {
      console.error("Erreur upload:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchCode.trim()) return;

    setSearching(true);
    setFoundFile(null);
    try {
      const allFiles = await dataService.query('FichierPartage');
      const file = allFiles.find(f => 
        f.code_partage?.toUpperCase() === searchCode.trim().toUpperCase() && 
        f.actif
      );
      
      if (file) {
        setFoundFile(file);
        await dataService.update('FichierPartage', file.id, {
          telechargements: (file.telechargements || 0) + 1
        });
      } else {
        toast.error("Fichier non trouvé ou lien désactivé");
      }
    } catch (error) {
      console.error("Erreur recherche:", error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Code copié!");
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type) => {
    if (!type) return <File className="w-5 h-5" />;
    if (type.startsWith("image/")) return <FileImage className="w-5 h-5 text-green-400" />;
    if (type.startsWith("video/")) return <FileVideo className="w-5 h-5 text-purple-400" />;
    if (type.startsWith("audio/")) return <FileAudio className="w-5 h-5 text-pink-400" />;
    if (type.includes("pdf") || type.includes("document")) return <FileText className="w-5 h-5 text-red-400" />;
    if (type.includes("zip") || type.includes("rar") || type.includes("archive")) return <Archive className="w-5 h-5 text-yellow-400" />;
    return <File className="w-5 h-5 text-blue-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--ha-surface2)' }}>
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--ha-surface2)' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--ha-surface)' }}>
              <img src="/assets/icons/fc25762eb_data-sharing.png" alt="Partage" className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Partage de Fichiers</h1>
              <p className="text-gray-400">Partagez vos fichiers via des codes uniques</p>
            </div>
          </div>
          <Button
            onClick={() => setUploadDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Uploader un fichier
          </Button>
        </div>

        {/* Lecteur de code */}
        <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: '#333333' }}>
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-400" />
              Accéder é  un fichier partagé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Entrez le code de partage (ex: ABC12345)"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-lg tracking-widest font-mono"
                  style={{ backgroundColor: 'var(--ha-surface2)', borderColor: 'var(--ha-border)' }}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={searching || !searchCode.trim()}
                className="bg-green-600 hover:bg-green-700 px-8"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Rechercher
                  </>
                )}
              </Button>
            </div>

            {foundFile && (
              <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--ha-surface)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--ha-surface)' }}>
                      {getFileIcon(foundFile.type_fichier)}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{foundFile.nom}</h3>
                      <p className="text-gray-400 text-sm">
                        {formatSize(foundFile.taille)} • {foundFile.telechargements || 0} téléchargement(s)
                      </p>
                      {foundFile.description && (
                        <p className="text-gray-500 text-sm mt-1">{foundFile.description}</p>
                      )}
                    </div>
                  </div>
                  <a
                    href={foundFile.fichier_url}
                    download={foundFile.nom}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mes fichiers partagés */}
        <Card style={{ backgroundColor: 'var(--ha-surface)', borderColor: '#333333' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <File className="w-5 h-5 text-purple-400" />
                Mes fichiers partagés
              </CardTitle>
              <Badge style={{ backgroundColor: 'var(--ha-surface)' }} className="text-white">
                {mesFichiers.length} fichier(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingFichiers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            ) : mesFichiers.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Aucun fichier partagé</p>
                <p className="text-gray-500 text-sm mt-1">Uploadez votre premier fichier pour commencer</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow style={{ borderColor: 'var(--ha-border)' }}>
                    <TableHead className="text-gray-400">Fichier</TableHead>
                    <TableHead className="text-gray-400">Code de partage</TableHead>
                    <TableHead className="text-gray-400">Taille</TableHead>
                    <TableHead className="text-gray-400">Téléchargements</TableHead>
                    <TableHead className="text-gray-400">Statut</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mesFichiers.map((fichier) => (
                    <TableRow key={fichier.id} style={{ borderColor: 'var(--ha-border)' }} className="hover:bg-[#333333]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(fichier.type_fichier)}
                          <div>
                            <p className="text-white font-medium">{fichier.nom}</p>
                            {fichier.description && (
                              <p className="text-gray-500 text-xs truncate max-w-[200px]">{fichier.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-1 rounded text-blue-400 font-mono text-sm" style={{ backgroundColor: 'var(--ha-surface2)' }}>
                            {fichier.code_partage}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyCode(fichier.code_partage)}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedId === fichier.code_partage ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{formatSize(fichier.taille)}</TableCell>
                      <TableCell className="text-gray-300">{fichier.telechargements || 0}</TableCell>
                      <TableCell>
                        <Badge className={fichier.actif ? "bg-green-600" : "bg-red-600"}>
                          {fichier.actif ? "Actif" : "Désactivé"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleActifMutation.mutate({ id: fichier.id, actif: !fichier.actif })}
                            className="text-gray-400 hover:text-white"
                          >
                            {fichier.actif ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteFichierMutation.mutate(fichier.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog d'upload */}
      <DraggableDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} title="Uploader un fichier" resizable={false}>
        <DraggableDialogBody>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-white text-xs font-medium" style={CG}>Fichier</Label>
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                style={{ borderColor: 'var(--ha-border)', backgroundColor: 'var(--ha-surface2)' }}
                onClick={() => document.getElementById('file-input').click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    {getFileIcon(selectedFile.type)}
                    <div className="text-left">
                      <p className="text-white font-medium">{selectedFile.name}</p>
                      <p className="text-gray-500 text-sm">{formatSize(selectedFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">Cliquez pour sélectionner un fichier</p>
                    <p className="text-gray-600 text-sm">Tous types de fichiers acceptés</p>
                  </>
                )}
              </div>
              <input
                id="file-input"
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files[0])}
              />
            </div>
            <div>
              <Label className="text-white text-xs font-medium" style={CG}>Description (optionnel)</Label>
              <Textarea
                placeholder="Ajoutez une description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{backgroundColor:'#2d2d2d',color:'#ffffff',borderColor:'#4d4d4d',...CG}}
              />
            </div>
          </div>
        </DraggableDialogBody>
        <DraggableDialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} style={{backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--ha-text-muted)', ...CG}}>
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              style={CG}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Uploader
                </>
              )}
            </Button>
        </DraggableDialogFooter>
      </DraggableDialog>
    </div>
  );
}

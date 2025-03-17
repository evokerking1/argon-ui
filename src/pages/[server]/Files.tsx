import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { 
  ChevronRight, AlertCircle, Folder, File, 
  Upload, Download, Trash2, RefreshCw, Search,
  FolderPlus, ArrowLeft, Archive,
  Check, X, Edit2, MoreVertical, Copy,
  FilePlus, Package, Code, FileText, Image, 
  Music, Video, PackageOpenIcon
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

// Types
interface Node {
  id: string;
  name: string;
  fqdn: string;
  port: number;
}

interface ServerDetails {
  id: string;
  internalId: string;
  validationToken: string;
  name: string;
  node: Node;
}

interface FileEntry {
  name: string;
  mode: string;
  size: number;
  isFile: boolean;
  isSymlink: boolean;
  modifiedAt: number;
  createdAt: number;
  mime: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface FileAction {
  loading: boolean;
  type: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

interface Modal {
  type: 'new-folder' | 'new-file' | 'file-editor' | 'compress';
  data?: any;
}

interface FileTypeInfo {
  icon: LucideIcon;  // Use LucideIcon type instead of React.ComponentType
  canEdit: boolean;
  editor?: 'monaco';
}

// Utility functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (date: number): string => {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
};

// File type configuration
const fileTypes: Record<string, FileTypeInfo> = {
  'text/': { icon: FileText, canEdit: true, editor: 'monaco' },
  'application/json': { icon: Code, canEdit: true, editor: 'monaco' },
  'application/javascript': { icon: Code, canEdit: true, editor: 'monaco' },
  'application/x-yaml': { icon: Code, canEdit: true, editor: 'monaco' },
  'image/': { icon: Image, canEdit: false },
  'audio/': { icon: Music, canEdit: false },
  'video/': { icon: Video, canEdit: false },
  'application/zip': { icon: Package, canEdit: false },
  'default': { icon: File, canEdit: false }
};

const getFileTypeInfo = (mime: string): FileTypeInfo => {
  const match = Object.entries(fileTypes).find(([key]) => mime.startsWith(key));
  return match ? match[1] : fileTypes.default;
};

const canExtractFile = (mime: string): boolean => {
  return [
    'application/zip',
    'application/x-tar',
    'application/x-gzip',
    'application/x-rar-compressed'
  ].includes(mime);
};

// Toast component
const Toast: React.FC<{ toast: Toast }> = ({ toast }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 
      ${toast.type === 'success' ? 'bg-gray-900 dark:bg-gray-800 text-white' : 'bg-red-500 text-white'}`}
  >
    {toast.type === 'success' ? (
      <Check className="w-4 h-4" />
    ) : (
      <AlertCircle className="w-4 h-4" />
    )}
    <span className="text-sm font-medium">{toast.message}</span>
  </motion.div>
);

// Context menu
const ContextMenu: React.FC<{
    file: FileEntry;
    position: { x: number; y: number };
    onClose: () => void;
    onAction: (action: string) => Promise<void>;
  }> = ({ file, position, onClose, onAction }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position);
    const fileType = getFileTypeInfo(file.mime);
  
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        // @ts-ignore
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      };
  
      // Adjust position to keep menu in viewport
      const adjustPosition = () => {
        if (menuRef.current) {
          const rect = menuRef.current.getBoundingClientRect();
          const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
          };
  
          let x = position.x;
          let y = position.y;
  
          // Adjust horizontal position if menu would overflow
          if (x + rect.width > viewport.width) {
            x = viewport.width - rect.width - 16; // 16px padding from edge
          }
  
          // Adjust vertical position if menu would overflow
          if (y + rect.height > viewport.height) {
            y = position.y - rect.height - 8; // Position above the trigger
          }
  
          setAdjustedPosition({ x, y });
        }
      };
  
      adjustPosition();
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose, position]);

  const actions = [
    ...(fileType.canEdit ? [{ label: 'Edit', icon: Edit2, action: 'edit' }] : []),
    ...(canExtractFile(file.mime) ? [{ label: 'Extract', icon: PackageOpenIcon, action: 'extract' }] : []),
    { label: 'Download', icon: Download, action: 'download' },
    { label: 'Copy', icon: Copy, action: 'copy' },
    { label: 'Delete', icon: Trash2, action: 'delete', destructive: true }
  ];

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-50 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
      style={{ top: position.y, left: position.x }}
    >
      {actions.map(({ label, icon: Icon, action, destructive }) => (
        <button
          key={action}
          onClick={() => onAction(action)}
          className={`w-full px-3 py-2 text-left flex items-center space-x-2 text-sm 
            ${destructive 
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </motion.div>
  );
};

// Main component
const FileManager: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Core state
  const [server, setServer] = useState<ServerDetails | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [modal, setModal] = useState<Modal | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    file: FileEntry;
    position: { x: number; y: number };
  } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [search, setSearch] = useState('');
  const [fileActions, setFileActions] = useState<Record<string, FileAction>>({});
  const [dropZoneActive, setDropZoneActive] = useState(false);

  // Refs
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Computed values
  const currentFullPath = useMemo(() => currentPath.join('/'), [currentPath]);

  // Toast handler
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // API calls
  const fetchServer = useCallback(async () => {
    try {
      const response = await fetch(`/api/servers/${id}?include[node]=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch server details');
      const data = await response.json();
      setServer(data);
    } catch (err) {
      setError('Failed to fetch server details');
      showToast('Failed to fetch server details', 'error');
    }
  }, [id, token, showToast]);

  const fetchFiles = useCallback(async () => {
    if (!server) return;

    try {
      setLoading(true);
      const response = await fetch(
        `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/list/${currentFullPath}`,
        { headers: { Authorization: `Bearer ${server?.validationToken}` } }
      );

      if (!response.ok) throw new Error('Failed to fetch directory contents');
      const data = await response.json();
      setFiles(data.contents);
      setError(null);
    } catch (err) {
      setError('Failed to fetch files');
      showToast('Failed to fetch files', 'error');
    } finally {
      setLoading(false);
    }
  }, [server, currentFullPath, token, showToast]);

  const getFileContents = useCallback(async (file: FileEntry): Promise<string> => {
    if (!server) return '';

    try {
      const response = await fetch(
        `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/contents/${currentFullPath}/${file.name}`,
        { headers: { Authorization: `Bearer ${server?.validationToken}` } }
      );

      if (!response.ok) throw new Error('Failed to fetch file contents');
      return await response.text();
    } catch (err) {
      showToast('Failed to load file contents', 'error');
      return '';
    }
  }, [server, currentFullPath, token, showToast]);

  // File operations
  const handleFileAction = useCallback(async (action: string, file: FileEntry) => {
    if (!server) return;

    try {
      setFileActions(prev => ({
        ...prev,
        [file.name]: { loading: true, type: action }
      }));

      switch (action) {
        case 'edit': {
          const content = await getFileContents(file);
          setModal({ type: 'file-editor', data: { file, content } });
          break;
        }
        
        case 'extract': {
          const response = await fetch(
            `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/extract/${currentFullPath}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${server?.validationToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ file: file.name })
            }
          );

          if (!response.ok) throw new Error('Failed to extract archive');
          showToast(`Extracted ${file.name}`);
          await fetchFiles();
          break;
        }

        case 'delete': {
          const response = await fetch(
            `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/delete/${currentFullPath}/${file.name}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${server?.validationToken}` }
            }
          );

          if (!response.ok) throw new Error('Failed to delete file');
          showToast(`Deleted ${file.name}`);
          await fetchFiles();
          break;
        }

        case 'download': {
          window.open(
            `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/download/${currentFullPath}/${file.name}?token=${server?.validationToken}`,
            '_blank'
          );
          break;
        }
      }
    } catch (err) {
      showToast(`Failed to ${action} ${file.name}`, 'error');
    } finally {
      setFileActions(prev => ({
        ...prev,
        [file.name]: { loading: false, type: action }
      }));
      setContextMenu(null);
    }
  }, [server, currentFullPath, token, getFileContents, fetchFiles, showToast]);

  const handleCreateFile = useCallback(async (name: string) => {
    if (!server) return;

    try {
      const response = await fetch(
        `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/write/${currentFullPath}/${name}`,
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${server?.validationToken}`,
            'Content-Type': 'application/octet-stream'
          },
          body: ''
        }
      );

      if (!response.ok) throw new Error('Failed to create file');
      
      showToast(`Created file ${name}`);
      setModal(null);
      await fetchFiles();
    } catch (err) {
      showToast('Failed to create file', 'error');
    }
  }, [server, currentFullPath, token, fetchFiles, showToast]);

  const handleCreateFolder = useCallback(async (name: string) => {
    if (!server) return;

    try {
      const response = await fetch(
        `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/create-directory/${currentFullPath}/${name}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${server?.validationToken}` }
        }
      );

      if (!response.ok) throw new Error('Failed to create folder');
      
      showToast(`Created folder ${name}`);
      setModal(null);
      await fetchFiles();
    } catch (err) {
      showToast('Failed to create folder', 'error');
    }
}, [server, currentFullPath, token, fetchFiles, showToast]);

const handleMassDelete = useCallback(async () => {
    if (!server || selectedFiles.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} items?`)) {
      return;
    }

    let success = true;
    for (const fileName of selectedFiles) {
      try {
        const response = await fetch(
          `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/delete/${currentFullPath}/${fileName}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${server?.validationToken}` }
          }
        );

        if (!response.ok) {
          success = false;
          showToast(`Failed to delete ${fileName}`, 'error');
        }
      } catch (err) {
        success = false;
        showToast(`Failed to delete ${fileName}`, 'error');
      }
    }

    if (success) {
      showToast(`Deleted ${selectedFiles.size} items`);
    }
    setSelectedFiles(new Set());
    await fetchFiles();
  }, [server, currentFullPath, token, selectedFiles, fetchFiles, showToast]);

const handleUpload = useCallback(async (files: FileList | File[]) => {
  if (!server) return;

  const newUploads: UploadProgress[] = Array.from(files).map(file => ({
    file,
    progress: 0,
    status: 'pending'
  }));

  setUploads(prev => [...prev, ...newUploads]);

  for (const upload of newUploads) {
    const formData = new FormData();
    formData.append('files', upload.file);

    try {
      const response = await fetch(
        `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/upload/${currentFullPath}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${server?.validationToken}` },
          body: formData
        }
      );

      if (!response.ok) throw new Error('Upload failed');

      setUploads(prev => 
        prev.map(u => 
          u.file === upload.file 
            ? { ...u, status: 'complete', progress: 100 } 
            : u
        )
      );
      showToast(`Uploaded ${upload.file.name}`);
    } catch (err) {
      setUploads(prev => 
        prev.map(u => 
          u.file === upload.file 
            ? { ...u, status: 'error', error: 'Upload failed' } 
            : u
        )
      );
      showToast(`Failed to upload ${upload.file.name}`, 'error');
    }
  }

  await fetchFiles();
  setTimeout(() => {
    setUploads(prev => prev.filter(u => u.status === 'pending' || u.status === 'uploading'));
  }, 3000);
}, [server, currentFullPath, token, fetchFiles, showToast]);

const handleCompress = useCallback(async (name: string) => {
  if (!server || selectedFiles.size === 0) return;

  try {
    const response = await fetch(
      `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/compress`,
      {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${server?.validationToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: Array.from(selectedFiles).map(f => `${currentFullPath}/${f}`),
          destination: `${currentFullPath}/${name}.zip`
        })
      }
    );

    if (!response.ok) throw new Error('Failed to create archive');
    
    showToast('Archive created successfully');
    setModal(null);
    setSelectedFiles(new Set());
    await fetchFiles();
  } catch (err) {
    showToast('Failed to create archive', 'error');
  }
}, [server, currentFullPath, token, selectedFiles, fetchFiles, showToast]);

const handleSaveFile = useCallback(async (file: FileEntry, content: string): Promise<boolean> => {
  if (!server) return false;

  try {
    setFileActions(prev => ({
      ...prev,
      [file.name]: { loading: true, type: 'save' }
    }));

    const response = await fetch(
      `http://${server.node.fqdn}:${server.node.port}/api/v1/filesystem/${server.internalId}/write/${currentFullPath}/${file.name}`,
      {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${server?.validationToken}`,
          'Content-Type': 'application/octet-stream'
        },
        body: content
      }
    );

    if (!response.ok) throw new Error('Failed to save file');
    
    showToast('File saved successfully');
    return true;
  } catch (err) {
    showToast('Failed to save file', 'error');
    return false;
  } finally {
    setFileActions(prev => ({
      ...prev,
      [file.name]: { loading: false, type: 'save' }
    }));
  }
}, [server, currentFullPath, token, showToast]);

// Drag and drop handlers
const handleDrag = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (e.type === 'dragenter') {
    dragCounterRef.current += 1;
  } else if (e.type === 'dragleave') {
    dragCounterRef.current -= 1;
  }
  
  if (e.type === 'dragenter' && dragCounterRef.current === 1) {
    setDropZoneActive(true);
  } else if (e.type === 'dragleave' && dragCounterRef.current === 0) {
    setDropZoneActive(false);
  }
}, []);

const handleDrop = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  dragCounterRef.current = 0;
  setDropZoneActive(false);

  const { files } = e.dataTransfer;
  if (files?.length) {
    handleUpload(files);
  }
}, [handleUpload]);

// Effect hooks
useEffect(() => {
  fetchServer();
}, [fetchServer]);

useEffect(() => {
  if (server) {
    fetchFiles();
  }
}, [server, fetchFiles]);

// Sort and filter files
const sortedFiles = useMemo(() => {
  return [...files]
    .filter(file => file.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Folders first
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
}, [files, search]);

return (
  <div 
    className="min-h-screen px-8 py-8 bg-gray-50 dark:bg-gray-900"
    onDragEnter={handleDrag}
    onDragLeave={handleDrag}
    onDragOver={handleDrag}
    onDrop={handleDrop}
  >
    {/* Toast Messages */}
    <AnimatePresence>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </AnimatePresence>

    {/* Drop Zone Overlay */}
    <AnimatePresence>
      {dropZoneActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/70 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center"
          >
            <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Drop files to upload</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Files will be uploaded to current directory</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <div className="max-w-[1500px] mx-auto space-y-6">
      {/* Header Section */}
      <div className="space-y-3">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <button
            onClick={() => navigate('/servers')}
            className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-100"
          >
            Servers
          </button>
          <ChevronRight className="w-4 h-4 mx-1" />
          <button
            onClick={() => navigate(`/servers/${id}`)}
            className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-100"
          >
            {server?.name}
          </button>
          <ChevronRight className="w-4 h-4 mx-1" />
          <span className="text-gray-900 dark:text-gray-100 font-medium">Files</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">File Manager</h1>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center px-3 py-1.5 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-md"
            >
              <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
              {error}
            </motion.div>
          )}
        </div>
      </div>

      {/* Path Navigation & Actions */}
      <div className="flex items-center justify-between">
        {/* Path */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPath(prev => prev.slice(0, -1))}
            disabled={currentPath.length === 0}
            className={`p-2 text-gray-500 dark:text-gray-400 transition-colors duration-100
              ${currentPath.length === 0 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:text-gray-900 dark:hover:text-gray-200'}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentPath([])}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            home
          </button>

          {currentPath.map((segment, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <button
                onClick={() => setCurrentPath(prev => prev.slice(0, index + 1))}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {segment}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-32 px-3 py-1 pl-9 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
            />
            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>

          {/* New File */}
          <button
            onClick={() => setModal({ type: 'new-file' })}
            className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <FilePlus className="w-4 h-4 mr-1.5" />
            New File
          </button>

          {/* New Folder */}
          <button
            onClick={() => setModal({ type: 'new-folder' })}
            className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <FolderPlus className="w-4 h-4 mr-1.5" />
            New Folder
          </button>

          {/* Upload */}
          <label className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
            <Upload className="w-4 h-4 mr-1.5" />
            Upload
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              onChange={e => {
                if (e.target.files?.length) {
                  handleUpload(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </label>

          {/* Selection Actions */}
          {selectedFiles.size > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setModal({ type: 'compress' })}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <Archive className="w-4 h-4 mr-1.5" />
                Compress ({selectedFiles.size})
              </button>
              <button
                onClick={handleMassDelete}
                className="flex items-center px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800/50 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete ({selectedFiles.size})
              </button>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Upload Progress */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-2"
          >
            {uploads.map((upload, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-md">
                <div className="flex items-center space-x-3">
                  <File className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">{upload.file.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {upload.error ? (
                    <span className="text-xs text-red-600 dark:text-red-400">{upload.error}</span>
                  ) : upload.status === 'complete' ? (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                    </motion.div>
                  ) : (
                    <div className="w-32 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gray-900 dark:bg-gray-100"
                        initial={{ width: 0 }}
                        animate={{ width: `${upload.progress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File List */}
      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <LoadingSpinner />
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl overflow-hidden"
        >
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === sortedFiles.length && sortedFiles.length > 0}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedFiles(new Set(sortedFiles.map(f => f.name)));
                      } else {
                        setSelectedFiles(new Set());
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-[#8146ab] focus:ring-[#8146ab] dark:focus:ring-[#8146ab]"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Modified</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
              {sortedFiles.map(file => {
                const fileType = getFileTypeInfo(file.mime);
                const FileIcon = file.isFile ? fileType.icon : Folder;

                return (
                  <motion.tr
                    key={file.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`${fileType.canEdit || !file.isFile ? 'cursor-pointer' : ''} 
                    hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-100`}
                    onClick={() => {
                      if (fileType.canEdit && file.isFile) {
                        handleFileAction('edit', file);
                      } else if (!file.isFile) {
                        setCurrentPath([...currentPath, file.name]);
                      }
                    }}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.name)}
                        onChange={() => {
                          const newSelected = new Set(selectedFiles);
                          if (newSelected.has(file.name)) {
                            newSelected.delete(file.name);
                          } else {
                            newSelected.add(file.name);
                          }
                          setSelectedFiles(newSelected);
                        }}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-[#8146ab] focus:ring-[#8146ab] dark:focus:ring-[#8146ab]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <FileIcon 
                          className={`w-4 h-4 ${
                            !file.isFile 
                              ? 'text-[#8146ab] dark:text-[#9e6bc4]'  // Folder icon color - Argon Purple
                              : file.mime.startsWith('image/') 
                              ? 'text-amber-600 dark:text-amber-500'  // Image files
                              : file.mime.startsWith('text/') || file.mime.includes('javascript') || file.mime.includes('json')
                              ? 'text-blue-600 dark:text-blue-500'  // Text/code files
                              : file.mime.includes('pdf')
                              ? 'text-red-600 dark:text-red-500'  // PDF files
                              : file.mime.startsWith('audio/')
                              ? 'text-yellow-600 dark:text-yellow-500'  // Audio files
                              : file.mime.startsWith('video/')
                              ? 'text-pink-600 dark:text-pink-500'  // Video files
                              : file.mime.includes('zip') || file.mime.includes('tar') || file.mime.includes('compress')
                              ? 'text-orange-600 dark:text-orange-500'  // Archive files
                              : 'text-gray-600 dark:text-gray-400'  // Default
                          }`}
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatBytes(file.size)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(file.modifiedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContextMenu({
                            file,
                            position: { x: e.clientX, y: e.clientY }
                          });
                        }}
                        className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}

              {sortedFiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                      <Folder className="w-8 h-8 mb-2 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm">
                        {search ? (
                          <>No files matching "<span className="font-medium">{search}</span>"</>
                        ) : (
                          'This folder is empty'
                        )}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/70 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.1 }}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl ${
                modal.type === 'file-editor' ? 'w-[900px] h-[600px]' : 'w-[400px]'
              }`}
            >
              {/* File Editor Modal */}
              {modal.type === 'file-editor' && (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {modal.data.file.name}
                    </h3>
                    <button
                      onClick={() => setModal(null)}
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Editor
                      value={modal.data.content}
                      language={modal.data.file.mime.split('/')[1] || 'plaintext'}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'on',
                        padding: { top: 20 }
                      }}
                      onChange={content => {
                        setModal(prev => prev ? {
                          ...prev,
                          data: { ...prev.data, content }
                        } : null);
                      }}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setModal(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (await handleSaveFile(modal.data.file, modal.data.content)) {
                          setModal(null);
                        }
                      }}
                      disabled={fileActions[modal.data.file.name]?.loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 rounded-md 
                               hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors duration-100 flex items-center 
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {fileActions[modal.data.file.name]?.loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

{/* New File Modal */}
{modal.type === 'new-file' && (
  <div className="p-6">
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Create New File</h3>
    <form onSubmit={async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      await handleCreateFile(formData.get('name') as string);
    }}>
      <input
        type="text"
        name="name"
        placeholder="File name"
        autoFocus
        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 
                 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700
                 placeholder:text-gray-500 dark:placeholder:text-gray-400"
      />
      <div className="flex justify-end space-x-2 mt-4">
        <button
          type="button"
          onClick={() => setModal(null)}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 
                   hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 
                   rounded-md hover:bg-gray-800 dark:hover:bg-gray-600 
                   transition-colors duration-100"
        >
          Create
        </button>
      </div>
    </form>
  </div>
)}

{/* New Folder Modal */}
{modal.type === 'new-folder' && (
  <div className="p-6">
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Create New Folder</h3>
    <form onSubmit={async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      await handleCreateFolder(formData.get('name') as string);
    }}>
      <input
        type="text"
        name="name"
        placeholder="Folder name"
        autoFocus
        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 
                 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700
                 placeholder:text-gray-500 dark:placeholder:text-gray-400"
      />
      <div className="flex justify-end space-x-2 mt-4">
        <button
          type="button"
          onClick={() => setModal(null)}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 
                   hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 
                   rounded-md hover:bg-gray-800 dark:hover:bg-gray-600 
                   transition-colors duration-100"
        >
          Create
        </button>
      </div>
    </form>
  </div>
)}

{/* Compress Modal */}
{modal.type === 'compress' && (
  <div className="p-6">
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Create Archive</h3>
    <form onSubmit={async (e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      await handleCompress(formData.get('name') as string);
    }}>
      <input
        type="text"
        name="name"
        placeholder="Archive name (without .zip)"
        autoFocus
        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 
                 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700
                 placeholder:text-gray-500 dark:placeholder:text-gray-400"
      />
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Selected items: {Array.from(selectedFiles).join(', ')}
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        <button
          type="button"
          onClick={() => setModal(null)}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 
                   hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 
                   rounded-md hover:bg-gray-800 dark:hover:bg-gray-600 
                   transition-colors duration-100"
        >
          Create Archive
        </button>
      </div>
    </form>
  </div>
)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu - Already defined in the component above */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu 
            file={contextMenu.file}
            position={contextMenu.position}
            onClose={() => setContextMenu(null)}
            onAction={action => handleFileAction(action, contextMenu.file)}
          />
        )}
      </AnimatePresence>
    </div>
  </div>
);

};

export default FileManager;
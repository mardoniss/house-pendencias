
import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, 
  Truck, 
  Plus, 
  Filter, 
  Search, 
  Calendar, 
  MapPin, 
  Camera, 
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  HardHat,
  ThumbsUp,
  ThumbsDown,
  Image as ImageIcon,
  History,
  Archive,
  MessageSquareWarning,
  Lock,
  Unlock,
  LogOut,
  User,
  Trash2
} from 'lucide-react';
import { 
  Issue, 
  Delivery, 
  ViewMode, 
  Priority, 
  IssueStatus, 
  DeliveryStatus 
} from './types';
import { 
  PriorityBadge, 
  IssueStatusBadge, 
  DeliveryStatusBadge, 
  Input, 
  Select, 
  TextArea, 
  Button 
} from './components/UIComponents';
import SignaturePad from './components/SignaturePad';
import { generateIssueDescription } from './services/geminiService';

// --- CONSTANTS ---
const REQUESTERS = ['Ailton', 'Iltinho', 'Geraldo', 'Engenharia', 'Almoxarifado', 'Diego'];
const RECEIVERS = ['Antônio', 'Izaias'];

// --- HELPERS ---
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// --- MOCK DATA ---
const MOCK_ISSUES: Issue[] = [
  {
    id: '1',
    title: 'Falta rejunte banheiro',
    description: 'Falta aplicação de rejunte epóxi no box do banheiro da suíte master. Necessário limpeza prévia.',
    priority: Priority.HIGH,
    assignee: 'João Silva (Azulejista)',
    requestedBy: 'Engenharia',
    deadline: '2023-10-25',
    location: 'Bloco A, Apto 302',
    photos: ['https://picsum.photos/400/300'],
    status: IssueStatus.OPEN,
    createdAt: '2023-10-20'
  },
  {
    id: '2',
    title: 'Pintura descascando',
    description: 'Parede da sala apresenta descascamento próximo ao rodapé. Possível umidade.',
    priority: Priority.MEDIUM,
    assignee: 'Maria Pinturas Ltda',
    requestedBy: 'Ailton',
    deadline: '2023-10-28',
    location: 'Bloco B, Hall de Entrada',
    photos: [],
    status: IssueStatus.WAITING, 
    createdAt: '2023-10-18',
    completionPhotos: ['https://picsum.photos/id/11/400/300'] // Example completion photo
  },
  {
    id: '3',
    title: 'Instalação Elétrica Exposta',
    description: 'Fios expostos na caixa de passagem do corredor principal.',
    priority: Priority.HIGH,
    assignee: 'EletroRápido',
    requestedBy: 'Geraldo',
    deadline: '2023-10-22',
    location: 'Área Comum, 1º Andar',
    photos: [],
    status: IssueStatus.WAITING,
    createdAt: '2023-10-21'
  },
  {
    id: '4',
    title: 'Vidro da varanda riscado',
    description: 'Vidro temperado da varanda gourmet apresenta riscos profundos.',
    priority: Priority.LOW,
    assignee: 'Vidraçaria Transparente',
    requestedBy: 'Diego',
    deadline: '2023-10-15',
    location: 'Bloco A, Apto 101',
    photos: [],
    status: IssueStatus.DONE, // Historic item
    createdAt: '2023-10-10',
    completionPhotos: ['https://picsum.photos/id/15/400/300']
  }
];

const MOCK_DELIVERIES: Delivery[] = [
  {
    id: '101',
    material: 'Cimento CP-II',
    supplier: 'Votorantim',
    quantity: 50,
    unit: 'sacos',
    expectedDate: '2023-10-24T08:00',
    status: DeliveryStatus.SCHEDULED,
  },
  {
    id: '102',
    material: 'Porcelanato 80x80',
    supplier: 'Portobello Shop',
    quantity: 120,
    unit: 'm²',
    expectedDate: '2023-10-22T14:00',
    invoiceNumber: 'NF-98765',
    status: DeliveryStatus.CHECKED,
    receivedAt: '2023-10-22T14:30',
    receiverName: 'Antônio',
  }
];

// Interface for filters
interface FilterState {
  status: string;
  priority: string;
  assignee: string;
  deadline: string; // "Up to" date
}

interface LogisticsFilterState {
  material: string;
  invoiceNumber: string;
  date: string;
  status: string;
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('issues');
  const [activeIssueTab, setActiveIssueTab] = useState<'active' | 'history'>('active'); // Sub-tab state
  const [issues, setIssues] = useState<Issue[]>(MOCK_ISSUES);
  const [deliveries, setDeliveries] = useState<Delivery[]>(MOCK_DELIVERIES);
  
  // Auth State
  const [isEngineeringAuth, setIsEngineeringAuth] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Search State
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState<Delivery | null>(null);
  const [showResolveModal, setShowResolveModal] = useState<Issue | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState<Issue | null>(null);
  
  // Filter States
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    priority: 'all',
    assignee: 'all',
    deadline: ''
  });
  const [logisticsFilters, setLogisticsFilters] = useState<LogisticsFilterState>({
    material: '',
    invoiceNumber: '',
    date: '',
    status: 'all'
  });

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Form States (Generic simplified handlers for demo)
  const [formData, setFormData] = useState<any>({});
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    const handleStatusChange = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  // --- Handlers ---

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const base64Promises = newFiles.map(convertFileToBase64);
      const base64Images = await Promise.all(base64Promises);
      
      const currentImages = formData[fieldName] || [];
      setFormData({
        ...formData,
        [fieldName]: [...currentImages, ...base64Images]
      });
    }
  };

  const removePhoto = (fieldName: string, index: number) => {
    const currentImages = formData[fieldName] || [];
    const updatedImages = currentImages.filter((_: any, i: number) => i !== index);
    setFormData({
      ...formData,
      [fieldName]: updatedImages
    });
  };

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const newIssue: Issue = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      description: formData.description,
      priority: formData.priority || Priority.MEDIUM,
      assignee: formData.assignee,
      requestedBy: formData.requestedBy,
      deadline: formData.deadline,
      location: formData.location,
      photos: formData.photos || [], 
      status: IssueStatus.OPEN,
      createdAt: new Date().toISOString()
    };
    setIssues([newIssue, ...issues]);
    setShowIssueModal(false);
    setFormData({});
  };

  const handleCreateDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    const newDelivery: Delivery = {
      id: Math.random().toString(36).substr(2, 9),
      material: formData.material,
      supplier: formData.supplier,
      quantity: Number(formData.quantity),
      unit: formData.unit,
      expectedDate: formData.expectedDate,
      invoiceNumber: formData.invoiceNumber,
      status: DeliveryStatus.SCHEDULED,
    };
    setDeliveries([newDelivery, ...deliveries]);
    setShowDeliveryModal(false);
    setFormData({});
  };

  const handleReceiveDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReceiveModal) return;

    const updatedDelivery: Delivery = {
      ...showReceiveModal,
      status: formData.status,
      receivedAt: new Date().toISOString(),
      receiverName: formData.receiverName,
      signature: formData.signature,
      receiptPhotos: formData.receiptPhotos || [],
    };

    setDeliveries(deliveries.map(d => d.id === updatedDelivery.id ? updatedDelivery : d));

    // If there is a problem, auto-open issue modal with pre-filled data
    if (formData.status === DeliveryStatus.PROBLEM) {
      setFormData({
        title: `Problema no recebimento: ${updatedDelivery.material}`,
        description: `Recebimento com não conformidade.\nFornecedor: ${updatedDelivery.supplier}\nNota: ${updatedDelivery.invoiceNumber}\nMotivo: `,
        priority: Priority.HIGH,
        location: 'Almoxarifado Central',
        deadline: new Date().toISOString().split('T')[0], // Today
        requestedBy: 'Almoxarifado' // Default requester for logistics issues
      });
      setShowReceiveModal(null);
      setTimeout(() => setShowIssueModal(true), 100); 
    } else {
      setShowReceiveModal(null);
      setFormData({});
    }
  };

  const handleIssueStatusUpdate = (issueId: string, newStatus: IssueStatus) => {
    setIssues(issues.map(i => i.id === issueId ? { ...i, status: newStatus } : i));
  };

  const handleResolveIssue = () => {
    if (!showResolveModal) return;
    
    // In a real app, upload photos here
    const completionPhotos = formData.completionPhotos || [];

    const updatedIssue: Issue = {
      ...showResolveModal,
      status: IssueStatus.WAITING,
      completionPhotos: completionPhotos
    };

    setIssues(issues.map(i => i.id === updatedIssue.id ? updatedIssue : i));
    setShowResolveModal(null);
    setFormData({});
  };

  const handleRejectIssue = () => {
    if (!showRejectionModal) return;

    const updatedIssue: Issue = {
      ...showRejectionModal,
      status: IssueStatus.REJECTED,
      rejectionReason: formData.rejectionReason || "Motivo não informado"
    };

    setIssues(issues.map(i => i.id === updatedIssue.id ? updatedIssue : i));
    setShowRejectionModal(null);
    setFormData({});
  };

  const handleGenerateDescription = async () => {
    if (!formData.title || !formData.location) return;
    setIsGeneratingAI(true);
    const desc = await generateIssueDescription(formData.title, formData.location, formData.priority || Priority.MEDIUM);
    setFormData({ ...formData, description: desc });
    setIsGeneratingAI(false);
  };

  const clearFilters = () => {
    if (viewMode === 'issues') {
      setFilters({
        status: 'all',
        priority: 'all',
        assignee: 'all',
        deadline: ''
      });
    } else if (viewMode === 'logistics') {
      setLogisticsFilters({
        material: '',
        invoiceNumber: '',
        date: '',
        status: 'all'
      });
    }
    setShowFilterPanel(false);
  };

  const handleEngineeringAccess = () => {
    if (isEngineeringAuth) {
      setViewMode('engineering');
      setShowFilterPanel(false);
    } else {
      setShowAuthModal(true);
      setAuthError('');
      setAuthPassword('');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === '1957') {
      setIsEngineeringAuth(true);
      setShowAuthModal(false);
      setViewMode('engineering');
      setShowFilterPanel(false);
    } else {
      setAuthError('Senha incorreta.');
    }
  };

  const handleLogout = () => {
    setIsEngineeringAuth(false);
    setViewMode('issues');
  };

  // --- Render Helpers ---

  const renderPhotoRow = (photos: string[] | undefined, label: string) => {
    if (!photos || photos.length === 0) return null;
    return (
      <div className="mt-3">
        <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, idx) => (
            <div key={idx} className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
              <img src={url} alt={`Evidência ${idx}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Views ---

  const renderIssueCard = (issue: Issue) => (
    <div key={issue.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4 transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-2">
        <PriorityBadge priority={issue.priority} />
        <IssueStatusBadge status={issue.status} />
      </div>
      <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{issue.title}</h3>
      <div className="flex items-center text-gray-500 text-sm mb-3">
        <MapPin size={14} className="mr-1" />
        {issue.location}
      </div>
      <p className="text-gray-600 text-sm mb-2 line-clamp-3">{issue.description}</p>
      
      {/* Rejection Reason Display */}
      {issue.status === IssueStatus.REJECTED && issue.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-red-800 font-medium text-xs mb-1">
            <MessageSquareWarning size={14} />
            Motivo da Rejeição:
          </div>
          <p className="text-red-700 text-sm italic">"{issue.rejectionReason}"</p>
        </div>
      )}

      {/* Show photos if available */}
      {renderPhotoRow(issue.photos, "Fotos da Pendência:")}
      {renderPhotoRow(issue.completionPhotos, "Fotos da Conclusão:")}

      <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Responsável</span>
          <span className="text-sm font-medium text-gray-800">{issue.assignee}</span>
        </div>
        <div className="flex flex-col items-end">
           {issue.requestedBy && (
              <span className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
                <User size={10} /> Solic.: {issue.requestedBy}
              </span>
           )}
          <span className="text-xs text-gray-400 uppercase tracking-wide">Prazo</span>
          <span className={`text-sm font-medium ${new Date(issue.deadline) < new Date() && issue.status !== IssueStatus.DONE ? 'text-red-600' : 'text-gray-800'}`}>
             {new Date(issue.deadline).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
      
      {/* Workflow Buttons for regular users */}
      {(issue.status === IssueStatus.OPEN || issue.status === IssueStatus.REJECTED) && (
        <button 
          onClick={() => handleIssueStatusUpdate(issue.id, IssueStatus.IN_PROGRESS)}
          className={`mt-3 w-full py-2 text-sm font-medium rounded-lg transition-colors ${
            issue.status === IssueStatus.REJECTED 
              ? 'bg-red-50 text-red-700 hover:bg-red-100' 
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          {issue.status === IssueStatus.REJECTED ? 'Reiniciar Resolução' : 'Iniciar Resolução'}
        </button>
      )}
       {issue.status === IssueStatus.IN_PROGRESS && (
        <button 
          onClick={() => {
            setFormData({});
            setShowResolveModal(issue);
          }}
          className="mt-3 w-full py-2 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-100 transition-colors"
        >
          Solicitar Aprovação
        </button>
      )}
    </div>
  );

  const renderApprovalCard = (issue: Issue) => (
    <div key={issue.id} className="bg-white p-4 rounded-xl border border-l-4 border-l-purple-500 border-gray-200 shadow-sm mb-4">
      <div className="flex justify-between items-start mb-2">
        <PriorityBadge priority={issue.priority} />
        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">
          Aguardando Engenharia
        </span>
      </div>
      <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{issue.title}</h3>
      <div className="flex items-center text-gray-500 text-sm mb-3">
        <MapPin size={14} className="mr-1" />
        {issue.location}
      </div>
      <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm text-gray-700">
        <p className="font-medium text-gray-900 mb-1">Executado por: {issue.assignee}</p>
        <p className="font-medium text-gray-900 mb-1">Solicitado por: {issue.requestedBy || 'N/A'}</p>
        <p className="italic mb-2">"{issue.description}"</p>
      </div>
      
      {/* Engineering View: Compare photos */}
      <div className="grid grid-cols-2 gap-2 mb-4">
         <div className="border border-red-100 bg-red-50 rounded p-2">
            <span className="text-[10px] uppercase font-bold text-red-700 block mb-1">Antes</span>
            {issue.photos.length > 0 ? (
               <img src={issue.photos[0]} className="w-full h-24 object-cover rounded bg-white" alt="Antes" />
            ) : (
               <div className="w-full h-24 flex items-center justify-center text-gray-400 text-xs italic bg-white rounded">Sem foto</div>
            )}
         </div>
         <div className="border border-green-100 bg-green-50 rounded p-2">
            <span className="text-[10px] uppercase font-bold text-green-700 block mb-1">Depois</span>
            {issue.completionPhotos && issue.completionPhotos.length > 0 ? (
               <img src={issue.completionPhotos[0]} className="w-full h-24 object-cover rounded bg-white" alt="Depois" />
            ) : (
               <div className="w-full h-24 flex items-center justify-center text-gray-400 text-xs italic bg-white rounded">Sem foto</div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button 
          variant="danger" 
          onClick={() => {
             setFormData({});
             setShowRejectionModal(issue);
          }}
          className="flex items-center justify-center gap-1"
        >
          <ThumbsDown size={16} /> Rejeitar
        </Button>
        <Button 
          variant="primary" 
          onClick={() => handleIssueStatusUpdate(issue.id, IssueStatus.DONE)}
          className="bg-green-600 hover:bg-green-700 flex items-center justify-center gap-1"
        >
          <ThumbsUp size={16} /> Aprovar
        </Button>
      </div>
    </div>
  );

  const renderDeliveryCard = (delivery: Delivery) => (
    <div key={delivery.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
      <div className="flex justify-between items-start mb-2">
        <DeliveryStatusBadge status={delivery.status} />
        <span className="text-xs text-gray-400 font-mono">
          {delivery.invoiceNumber ? `NF: ${delivery.invoiceNumber}` : `#${delivery.id}`}
        </span>
      </div>
      <h3 className="font-bold text-gray-900 text-lg mb-1">{delivery.quantity} {delivery.unit} de {delivery.material}</h3>
      <div className="flex items-center text-gray-500 text-sm mb-3">
        <Truck size={14} className="mr-1" />
        {delivery.supplier}
      </div>
      
      <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
        <div>
          <div className="text-xs text-gray-400">Previsão</div>
          <div className="text-sm font-medium">
            {new Date(delivery.expectedDate).toLocaleDateString('pt-BR')} {new Date(delivery.expectedDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
        {delivery.status === DeliveryStatus.SCHEDULED && (
          <Button 
            variant="primary" 
            className="text-sm py-1.5 px-3"
            onClick={() => {
              setFormData({ 
                status: DeliveryStatus.ARRIVED,
                receiverName: '' 
              });
              setShowReceiveModal(delivery);
            }}
          >
            Receber
          </Button>
        )}
      </div>
    </div>
  );

  const getPageTitle = () => {
    switch(viewMode) {
      case 'issues': return 'Pendências da Obra';
      case 'logistics': return 'Logística e Materiais';
      case 'engineering': return 'Aprovação Técnica';
      default: return 'House Garden';
    }
  };

  const pendingApprovalsCount = issues.filter(i => i.status === IssueStatus.WAITING).length;

  // Derive unique assignees for filter dropdown
  const uniqueAssignees = Array.from(new Set(issues.map(i => i.assignee)));

  // Filter and Sort Logic for ISSUES
  const filteredIssues = issues.filter(issue => {
    // 0. Active Tab Logic (Main Filter)
    if (viewMode === 'issues') {
       if (activeIssueTab === 'active' && issue.status === IssueStatus.DONE) return false;
       if (activeIssueTab === 'history' && issue.status !== IssueStatus.DONE) return false;
    }

    // 1. Status Filter (Dropdown)
    if (filters.status !== 'all' && issue.status !== filters.status) return false;
    
    // 2. Priority Filter
    if (filters.priority !== 'all' && issue.priority !== filters.priority) return false;
    
    // 3. Assignee Filter
    if (filters.assignee !== 'all' && issue.assignee !== filters.assignee) return false;
    
    // 4. Deadline Filter (Issues due ON or BEFORE selected date)
    if (filters.deadline && issue.deadline > filters.deadline) return false;

    // 5. Global Search (Search Bar)
    if (searchQuery) {
       const q = searchQuery.toLowerCase();
       const matchesSearch = 
         issue.title.toLowerCase().includes(q) ||
         issue.description.toLowerCase().includes(q) ||
         issue.location.toLowerCase().includes(q) ||
         (issue.requestedBy && issue.requestedBy.toLowerCase().includes(q)) ||
         issue.assignee.toLowerCase().includes(q);
       
       if (!matchesSearch) return false;
    }

    return true;
  }).sort((a, b) => {
     // Default sort: Priority (High->Low), then Date (Asc - Nearest first)
     const pMap = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
     if (pMap[b.priority] !== pMap[a.priority]) {
       return pMap[b.priority] - pMap[a.priority];
     }
     return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  // Filter Logic for DELIVERIES
  const filteredDeliveries = deliveries.filter(d => {
    // Material
    if (logisticsFilters.material && !d.material.toLowerCase().includes(logisticsFilters.material.toLowerCase())) return false;
    // Invoice
    if (logisticsFilters.invoiceNumber && !d.invoiceNumber?.toLowerCase().includes(logisticsFilters.invoiceNumber.toLowerCase())) return false;
    // Date (Starts with YYYY-MM-DD match)
    if (logisticsFilters.date && !d.expectedDate.startsWith(logisticsFilters.date)) return false;
    // Status
    if (logisticsFilters.status !== 'all' && d.status !== logisticsFilters.status) return false;

    // Global Search (Search Bar) for Logistics
    if (searchQuery) {
       const q = searchQuery.toLowerCase();
       const matchesSearch = 
         d.material.toLowerCase().includes(q) ||
         d.supplier.toLowerCase().includes(q) ||
         (d.invoiceNumber && d.invoiceNumber.toLowerCase().includes(q));
         
       if (!matchesSearch) return false;
    }

    return true;
  }).sort((a, b) => new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime());

  const activeIssueFilterCount = Object.values(filters).filter(v => v !== 'all' && v !== '').length;
  const activeLogisticsFilterCount = Object.values(logisticsFilters).filter(v => v !== 'all' && v !== '').length;
  const activeFilterCount = viewMode === 'issues' ? activeIssueFilterCount : activeLogisticsFilterCount;

  return (
    <div className="min-h-screen pb-20 max-w-md mx-auto bg-gray-50 relative shadow-2xl overflow-hidden">
      
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 px-4 py-3 flex items-center justify-between h-16 transition-all">
        {isSearchActive ? (
          <div className="flex-1 flex items-center gap-2 animate-in fade-in duration-200 w-full">
            <Search size={20} className="text-gray-400 shrink-0" />
            <input 
              type="text"
              autoFocus
              placeholder={viewMode === 'logistics' ? "Buscar material, fornecedor..." : "Buscar pendência, responsável..."}
              className="flex-1 bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 text-base outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              onClick={() => { setIsSearchActive(false); setSearchQuery(''); }}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">H</div>
              <h1 className="text-xl font-bold text-slate-800">House Garden</h1>
            </div>
            <div className="flex items-center gap-3">
              {isOffline && (
                <span className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                  <AlertTriangle size={12} className="mr-1" /> Offline
                </span>
              )}
              <button 
                onClick={() => setIsSearchActive(true)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Search size={20} />
              </button>
            </div>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className="p-4">
        {/* Toggle / Filter Bar */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">
            {isSearchActive && searchQuery ? 'Resultados da Busca' : getPageTitle()}
          </h2>
          {(viewMode === 'issues' || viewMode === 'logistics') && (
            <button 
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`p-2 border rounded-lg shadow-sm transition-colors relative ${showFilterPanel || activeFilterCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white text-gray-600'}`}
            >
              <Filter size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          )}
        </div>

        {/* Engineering Status Banner */}
        {viewMode === 'engineering' && isEngineeringAuth && (
           <div className="bg-purple-100 border border-purple-200 text-purple-800 p-3 rounded-lg mb-4 flex justify-between items-center text-sm">
             <div className="flex items-center gap-2">
                <Lock size={16} />
                <span>Modo Engenharia Ativo</span>
             </div>
             <button onClick={handleLogout} className="flex items-center gap-1 font-semibold hover:text-purple-900">
               <LogOut size={14} /> Sair
             </button>
           </div>
        )}

        {/* Sub Navigation (Pendentes / Histórico) */}
        {viewMode === 'issues' && !searchQuery && (
          <div className="flex p-1 bg-gray-200 rounded-xl mb-6 mx-1">
             <button 
               onClick={() => setActiveIssueTab('active')}
               className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeIssueTab === 'active' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <ClipboardCheck size={16} /> Pendentes
             </button>
             <button 
               onClick={() => setActiveIssueTab('history')}
               className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeIssueTab === 'history' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
               <History size={16} /> Histórico (Resolvidas)
             </button>
          </div>
        )}

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800 text-sm">
                {viewMode === 'issues' ? 'Filtrar Pendências' : 'Filtrar Entregas'}
              </h3>
              <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">Limpar filtros</button>
            </div>
            
            {viewMode === 'issues' ? (
              // ISSUE FILTERS
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Select 
                    label="Status"
                    value={filters.status}
                    onChange={e => setFilters({...filters, status: e.target.value})}
                  >
                    <option value="all">Todos</option>
                    {Object.values(IssueStatus).filter(s => activeIssueTab === 'active' ? s !== IssueStatus.DONE : s === IssueStatus.DONE).map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>

                  <Select 
                    label="Prioridade"
                    value={filters.priority}
                    onChange={e => setFilters({...filters, priority: e.target.value})}
                  >
                    <option value="all">Todas</option>
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Select 
                    label="Responsável"
                    value={filters.assignee}
                    onChange={e => setFilters({...filters, assignee: e.target.value})}
                  >
                    <option value="all">Todos os Responsáveis</option>
                    {uniqueAssignees.map(a => <option key={a} value={a}>{a}</option>)}
                  </Select>

                   <Input 
                    label="Prazo até (Data Limite)" 
                    type="date"
                    value={filters.deadline}
                    onChange={e => setFilters({...filters, deadline: e.target.value})}
                  />
                </div>
              </>
            ) : (
              // LOGISTICS FILTERS
              <>
                <Input 
                  label="Produto / Material"
                  placeholder="Ex: Cimento, Porcelanato"
                  value={logisticsFilters.material}
                  onChange={e => setLogisticsFilters({...logisticsFilters, material: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-3">
                   <Input 
                    label="Nota Fiscal"
                    placeholder="Número"
                    value={logisticsFilters.invoiceNumber}
                    onChange={e => setLogisticsFilters({...logisticsFilters, invoiceNumber: e.target.value})}
                  />
                   <Input 
                    label="Data" 
                    type="date"
                    value={logisticsFilters.date}
                    onChange={e => setLogisticsFilters({...logisticsFilters, date: e.target.value})}
                  />
                </div>
                 <Select 
                    label="Status da Entrega"
                    value={logisticsFilters.status}
                    onChange={e => setLogisticsFilters({...logisticsFilters, status: e.target.value})}
                  >
                    <option value="all">Todos</option>
                    {Object.values(DeliveryStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
              </>
            )}
            
            <div className="mt-2 pt-2 border-t flex justify-end">
               <button 
                 onClick={() => setShowFilterPanel(false)}
                 className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200"
               >
                 Fechar
               </button>
            </div>
          </div>
        )}

        {/* Lists */}
        <div className="space-y-4">
          {viewMode === 'issues' && (
             filteredIssues.map(renderIssueCard)
          )}

          {viewMode === 'engineering' && (
             issues
             .filter(i => i.status === IssueStatus.WAITING)
             .filter(i => {
                if (searchQuery) {
                  const q = searchQuery.toLowerCase();
                  return i.title.toLowerCase().includes(q) || i.assignee.toLowerCase().includes(q) || i.location.toLowerCase().includes(q);
                }
                return true;
             })
             .map(renderApprovalCard)
          )}

          {viewMode === 'logistics' && (
            filteredDeliveries.map(renderDeliveryCard)
          )}
          
          {/* Empty State */}
          {((viewMode === 'issues' && filteredIssues.length === 0) || 
            (viewMode === 'logistics' && filteredDeliveries.length === 0) ||
            (viewMode === 'engineering' && issues.filter(i => i.status === IssueStatus.WAITING).length === 0)) && (
            <div className="text-center py-10 text-gray-400">
              {viewMode === 'engineering' ? (
                <>
                  <CheckCircle2 size={48} className="mx-auto mb-2 text-green-500 opacity-50" />
                  <p>Tudo certo! Nenhuma aprovação pendente.</p>
                </>
              ) : viewMode === 'issues' && activeIssueTab === 'history' && !searchQuery ? (
                 <>
                   <Archive size={48} className="mx-auto mb-2 opacity-20" />
                   <p>Nenhuma pendência resolvida ainda.</p>
                 </>
              ) : (
                <div className="flex flex-col items-center">
                   <Search size={48} className="mb-2 opacity-20" />
                   <p>Nenhum registro encontrado.</p>
                   {(activeFilterCount > 0 || searchQuery) && (
                     <p className="text-sm mt-1 text-blue-500 cursor-pointer" onClick={() => { clearFilters(); setSearchQuery(''); setIsSearchActive(false); }}>Limpar busca e filtros</p>
                   )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button - Only for Issues (Active) and Logistics */}
      {viewMode !== 'engineering' && !(viewMode === 'issues' && activeIssueTab === 'history') && (
        <div className="fixed bottom-24 right-4 z-40">
          <button 
            onClick={() => viewMode === 'issues' ? setShowIssueModal(true) : setShowDeliveryModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-3 z-30 max-w-md mx-auto">
        <button 
          onClick={() => { setViewMode('issues'); setShowFilterPanel(false); }}
          className={`flex flex-col items-center gap-1 ${viewMode === 'issues' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <ClipboardCheck size={24} strokeWidth={viewMode === 'issues' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Qualidade</span>
        </button>
        
        <button 
          onClick={handleEngineeringAccess}
          className={`relative flex flex-col items-center gap-1 ${viewMode === 'engineering' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <div className="relative">
            {isEngineeringAuth ? <HardHat size={24} strokeWidth={viewMode === 'engineering' ? 2.5 : 2} /> : <Lock size={20} />}
            {pendingApprovalsCount > 0 && isEngineeringAuth && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full">
                {pendingApprovalsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Engenharia</span>
        </button>

        <button 
          onClick={() => { setViewMode('logistics'); setShowFilterPanel(false); }}
          className={`flex flex-col items-center gap-1 ${viewMode === 'logistics' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Truck size={24} strokeWidth={viewMode === 'logistics' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Logística</span>
        </button>
      </nav>

      {/* --- MODALS --- */}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-6 text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                  <Lock size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Acesso Restrito</h3>
                <p className="text-gray-500 text-sm mb-6">Esta área é exclusiva para a equipe de Engenharia. Digite a senha para continuar.</p>
                
                <form onSubmit={handleLoginSubmit}>
                  <div className="mb-4">
                     <Input 
                       label="" 
                       type="password"
                       placeholder="Senha de Acesso"
                       className="text-center text-lg tracking-widest"
                       value={authPassword}
                       onChange={e => {
                         setAuthPassword(e.target.value);
                         setAuthError('');
                       }}
                       autoFocus
                     />
                     {authError && <p className="text-red-500 text-xs mt-2">{authError}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAuthModal(false)}>Cancelar</Button>
                    <Button type="submit" variant="primary" className="flex-1 bg-purple-600 hover:bg-purple-700">Entrar</Button>
                  </div>
                </form>
                <div className="mt-4 text-[10px] text-gray-400">Dica para teste: Tablet</div>
             </div>
          </div>
        </div>
      )}

      {/* Resolve Issue Modal (Upload Evidence) */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-auto rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl">
             <div className="p-4 border-b flex justify-between items-center bg-purple-50">
              <h3 className="font-bold text-lg text-purple-900">Registrar Solução</h3>
              <button onClick={() => setShowResolveModal(null)} className="text-purple-900"><X /></button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">
                Você está marcando a pendência <strong>"{showResolveModal.title}"</strong> como resolvida. Por favor, adicione uma foto do trabalho concluído.
              </p>

               <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto da Conclusão (Obrigatório)</label>
                 <label htmlFor="resolve-photo-upload" className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors relative">
                    <input 
                      id="resolve-photo-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e, 'completionPhotos')}
                    />
                    <Camera size={32} />
                    <span className="text-sm mt-2 font-medium">Toque para adicionar foto</span>
                 </label>

                 {/* Photo Previews */}
                 {formData.completionPhotos && formData.completionPhotos.length > 0 && (
                   <div className="flex gap-2 mt-3 overflow-x-auto">
                     {formData.completionPhotos.map((photo: string, index: number) => (
                       <div key={index} className="relative w-20 h-20 shrink-0">
                         <img src={photo} className="w-full h-full object-cover rounded-lg border border-gray-200" />
                         <button 
                            type="button"
                            onClick={() => removePhoto('completionPhotos', index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1"
                         >
                           <X size={10} />
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowResolveModal(null)}>Cancelar</Button>
              <Button variant="primary" className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handleResolveIssue}>Enviar para Aprovação</Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-auto rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl">
             <div className="p-4 border-b flex justify-between items-center bg-red-50">
              <h3 className="font-bold text-lg text-red-900">Rejeitar Pendência</h3>
              <button onClick={() => setShowRejectionModal(null)} className="text-red-900"><X /></button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">
                Você está rejeitando a entrega da pendência <strong>"{showRejectionModal.title}"</strong>. Por favor, informe o motivo para o responsável corrigir.
              </p>

              <TextArea 
                label="Motivo da Rejeição" 
                placeholder="Ex: O acabamento ainda está áspero; Falta limpar a área..."
                rows={3}
                value={formData.rejectionReason || ''}
                onChange={e => setFormData({...formData, rejectionReason: e.target.value})}
              />
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowRejectionModal(null)}>Cancelar</Button>
              <Button variant="danger" className="flex-1" onClick={handleRejectIssue}>Confirmar Rejeição</Button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">Nova Pendência</h3>
              <button onClick={() => setShowIssueModal(false)} className="text-gray-500"><X /></button>
            </div>
            
            <form onSubmit={handleCreateIssue} className="p-5 overflow-y-auto flex-1 no-scrollbar">
              <Input 
                label="Título Curto" 
                placeholder="Ex: Falta selante"
                value={formData.title || ''}
                onChange={e => setFormData({...formData, title: e.target.value})}
                required
              />

              <div className="grid grid-cols-2 gap-4 mb-3">
                 <Select 
                    label="Solicitado por"
                    value={formData.requestedBy || ''}
                    onChange={e => setFormData({...formData, requestedBy: e.target.value})}
                    required
                  >
                    <option value="">Selecione...</option>
                    {REQUESTERS.map(r => <option key={r} value={r}>{r}</option>)}
                  </Select>
                 <Select 
                    label="Prioridade"
                    value={formData.priority || Priority.MEDIUM}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                  >
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
              </div>

              <div className="mb-3">
                  <Input 
                    label="Data Limite" 
                    type="date"
                    value={formData.deadline || ''}
                    onChange={e => setFormData({...formData, deadline: e.target.value})}
                    required
                  />
              </div>

              <Input 
                label="Localização" 
                placeholder="Ex: Pavimento 3, Apto 302"
                value={formData.location || ''}
                onChange={e => setFormData({...formData, location: e.target.value})}
                required
              />

              <div className="relative">
                <TextArea 
                  label="Descrição Detalhada" 
                  rows={4}
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Descreva o problema..."
                />
                {/* AI Helper Button */}
                <button 
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={!formData.title || !formData.location || isGeneratingAI}
                  className="absolute top-0 right-0 text-xs flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-full border border-purple-100 hover:bg-purple-100 disabled:opacity-50"
                >
                  <Sparkles size={12} />
                  {isGeneratingAI ? 'Gerando...' : 'Gerar com IA'}
                </button>
              </div>

              <Input 
                label="Responsável" 
                placeholder="Ex: Mestre de Obras"
                value={formData.assignee || ''}
                onChange={e => setFormData({...formData, assignee: e.target.value})}
                required
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Fotos / Anexos (Problema)</label>
                <div className="flex gap-2 flex-wrap">
                  <label htmlFor="issue-photo-upload" className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 cursor-pointer">
                    <input 
                      id="issue-photo-upload"
                      type="file" 
                      accept="image/*" 
                      multiple
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e, 'photos')}
                    />
                    <Camera size={20} />
                    <span className="text-[10px] mt-1">Add</span>
                  </label>
                  
                  {formData.photos && formData.photos.map((photo: string, index: number) => (
                    <div key={index} className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden relative border border-gray-200">
                      <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removePhoto('photos', index)}
                        className="absolute top-0 right-0 bg-black/50 text-white p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </form>
            
            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowIssueModal(false)}>Cancelar</Button>
              <Button variant="primary" className="flex-1" onClick={handleCreateIssue}>Salvar Pendência</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-auto rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">Agendar Entrega</h3>
              <button onClick={() => setShowDeliveryModal(false)} className="text-gray-500"><X /></button>
            </div>
            <form onSubmit={handleCreateDelivery} className="p-5 flex-1 overflow-y-auto max-h-[70vh] no-scrollbar">
              <Input 
                label="Material" 
                placeholder="Ex: Cerâmica 60x60"
                value={formData.material || ''}
                onChange={e => setFormData({...formData, material: e.target.value})}
                required
              />
              <Input 
                label="Fornecedor / Transportadora" 
                value={formData.supplier || ''}
                onChange={e => setFormData({...formData, supplier: e.target.value})}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Quantidade" 
                  type="number"
                  value={formData.quantity || ''}
                  onChange={e => setFormData({...formData, quantity: e.target.value})}
                  required
                />
                 <Input 
                  label="Unidade" 
                  placeholder="kg, m², sc"
                  value={formData.unit || ''}
                  onChange={e => setFormData({...formData, unit: e.target.value})}
                  required
                />
              </div>
              <Input 
                label="Data e Hora Prevista" 
                type="datetime-local"
                value={formData.expectedDate || ''}
                onChange={e => setFormData({...formData, expectedDate: e.target.value})}
                required
              />
              <Input 
                label="Nota Fiscal (Opcional)" 
                placeholder="Número do pedido ou NF"
                value={formData.invoiceNumber || ''}
                onChange={e => setFormData({...formData, invoiceNumber: e.target.value})}
              />
            </form>
            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowDeliveryModal(false)}>Cancelar</Button>
              <Button variant="primary" className="flex-1" onClick={handleCreateDelivery}>Agendar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-blue-50">
              <h3 className="font-bold text-lg text-blue-900">Recebimento de Material</h3>
              <button onClick={() => setShowReceiveModal(null)} className="text-blue-900"><X /></button>
            </div>
            
            <form className="p-5 flex-1 overflow-y-auto no-scrollbar">
              <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm text-gray-600">
                <p><strong>Material:</strong> {showReceiveModal.material}</p>
                <p><strong>Qtd Agendada:</strong> {showReceiveModal.quantity} {showReceiveModal.unit}</p>
                <p><strong>Fornecedor:</strong> {showReceiveModal.supplier}</p>
              </div>

              <Select 
                label="Status da Conferência"
                value={formData.status || DeliveryStatus.ARRIVED}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value={DeliveryStatus.ARRIVED}>{DeliveryStatus.ARRIVED}</option>
                <option value={DeliveryStatus.CHECKED}>{DeliveryStatus.CHECKED}</option>
                <option value={DeliveryStatus.PROBLEM}>{DeliveryStatus.PROBLEM}</option>
              </Select>

              {formData.status === DeliveryStatus.PROBLEM && (
                 <div className="p-3 mb-4 bg-red-50 text-red-700 text-sm rounded border border-red-200 flex items-start gap-2">
                   <AlertTriangle className="shrink-0" size={16} />
                   <span>Ao salvar, o sistema abrirá automaticamente uma tela para registrar a Não Conformidade.</span>
                 </div>
              )}

              <Select 
                label="Recebido Por" 
                value={formData.receiverName || ''}
                onChange={e => setFormData({...formData, receiverName: e.target.value})}
                required
              >
                <option value="">Selecione...</option>
                {RECEIVERS.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>

              <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 mb-2">Assinatura Digital</label>
                 <SignaturePad 
                   onEnd={(data) => setFormData({...formData, signature: data})}
                   onClear={() => setFormData({...formData, signature: undefined})}
                 />
              </div>

               <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto da NF / Material</label>
                 <label htmlFor="receive-photo-upload" className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer relative">
                    <input 
                      id="receive-photo-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e, 'receiptPhotos')}
                    />
                    <Camera size={24} />
                    <span className="text-xs mt-2 font-medium">Toque para fotografar</span>
                 </label>
                 {formData.receiptPhotos && formData.receiptPhotos.length > 0 && (
                   <div className="flex gap-2 mt-2 overflow-x-auto">
                     {formData.receiptPhotos.map((photo: string, index: number) => (
                       <div key={index} className="relative w-16 h-16 shrink-0">
                         <img src={photo} className="w-full h-full object-cover rounded-lg" />
                         <button 
                            type="button"
                            onClick={() => removePhoto('receiptPhotos', index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                         >
                           <X size={10} />
                         </button>
                       </div>
                     ))}
                   </div>
                 )}
              </div>

            </form>
            <div className="p-4 border-t bg-gray-50 flex gap-3">
               <Button variant="secondary" className="flex-1" onClick={() => setShowReceiveModal(null)}>Cancelar</Button>
               <Button variant={formData.status === DeliveryStatus.PROBLEM ? 'danger' : 'primary'} className="flex-1" onClick={handleReceiveDelivery}>
                 {formData.status === DeliveryStatus.PROBLEM ? 'Registrar Problema' : 'Concluir Recebimento'}
               </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

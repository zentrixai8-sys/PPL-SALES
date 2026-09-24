import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  GrievanceTicket,
  GrievanceCategory,
  GrievancePriority,
  GrievanceStatus,
} from '../../types';
import {
  fetchGrievanceTicketsFromSheet,
  saveGrievanceTicketToSheet,
  resolveGrievanceTicketInSheet,
} from '../../services/api';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Upload,
  X,
  ShieldAlert,
  Building2,
  Phone,
  MapPin,
  FileText,
  User,
  CheckCircle,
  Eye,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Maximize2,
  List,
  LayoutGrid,
  Tag,
  Printer,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';

const CATEGORIES: GrievanceCategory[] = [
  'Product Quality',
  'Packaging / Damage',
  'Delivery Delay',
  'Billing / Scheme Mismatch',
  'Shade / Color Variation',
  'Material Replacement',
  'Other',
];

const PRIORITIES: GrievancePriority[] = ['Low', 'Medium', 'High', 'Urgent'];

// Loads a ticket photo (already-base64 or a remote URL) into a normalized JPEG
// data URL so it can be embedded in the PDF regardless of its original source/format.
const loadImageAsDataUrl = (src: string): Promise<{ dataUrl: string; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: img.naturalWidth, height: img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

// Builds a branded, print-ready PDF for a single grievance ticket — shared by
// the modal's Print and Download actions so both produce identical output.
const generateGrievanceTicketPdf = async (ticket: GrievanceTicket): Promise<jsPDF> => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let y = 0;

  const BRAND: [number, number, number] = [35, 50, 139];
  const SLATE_DARK: [number, number, number] = [30, 41, 59];
  const SLATE_MID: [number, number, number] = [100, 116, 139];
  const SLATE_LIGHT: [number, number, number] = [226, 232, 240];

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      doc.addPage();
      y = 18;
    }
  };

  // Header band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('POPULAR PAINTS & CHEMICALS', marginX, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('Customer Grievance Ticket', marginX, 19);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - marginX, 19, { align: 'right' });

  y = 34;

  // Ticket number
  doc.setTextColor(...SLATE_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(ticket.ticketNumber, marginX, y);

  // Status / priority / category badges, right-aligned
  const badgeY = y - 5;
  let bx = pageWidth - marginX;
  const drawBadgeRight = (label: string, rgb: [number, number, number]) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const w = doc.getTextWidth(label) + 6;
    bx -= w;
    doc.setFillColor(...rgb);
    doc.roundedRect(bx, badgeY, w, 6.5, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(label, bx + w / 2, badgeY + 4.4, { align: 'center' });
    bx -= 3;
  };
  const statusColor: [number, number, number] = ticket.status === 'Closed' ? [16, 185, 129] : ticket.status === 'In Review' ? [14, 165, 233] : [245, 158, 11];
  drawBadgeRight(ticket.status.toUpperCase(), statusColor);
  const priorityColor: [number, number, number] = ticket.priority === 'Urgent' ? [225, 29, 72] : ticket.priority === 'High' ? [217, 119, 6] : ticket.priority === 'Medium' ? [2, 132, 199] : [100, 116, 139];
  drawBadgeRight(`${ticket.priority.toUpperCase()} PRIORITY`, priorityColor);
  drawBadgeRight(ticket.category.toUpperCase(), [79, 70, 229]);

  y += 7;
  doc.setTextColor(...SLATE_DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Customer: ${ticket.customerName}`, marginX, y);

  y += 6;
  doc.setDrawColor(...SLATE_LIGHT);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  // 3-column info block: Party / Contact / Raised By
  const colW = contentWidth / 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, y, contentWidth, 26, 2, 2, 'F');
  const drawInfoCol = (idx: number, label: string, lines: string[]) => {
    const cx = marginX + 4 + idx * colW;
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_MID);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), cx, y + 6);
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_DARK);
    lines.forEach((line, li) => {
      doc.setFont('helvetica', li === 0 ? 'bold' : 'normal');
      doc.text(line, cx, y + 12 + li * 5, { maxWidth: colW - 6 });
    });
  };
  drawInfoCol(0, 'Party / Customer', [ticket.customerName, ticket.contactPerson ? `Attn: ${ticket.contactPerson}` : ''].filter(Boolean));
  drawInfoCol(1, 'Contact & City', [ticket.contactNumber || 'N/A', ticket.city || ''].filter(Boolean));
  drawInfoCol(2, 'Raised By', [ticket.salesPersonName, ticket.createdAt].filter(Boolean));
  y += 26 + 8;

  // Description
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_MID);
  doc.text('GRIEVANCE / PROBLEM DESCRIPTION', marginX, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_DARK);
  const descLines = doc.splitTextToSize(ticket.description || '-', contentWidth - 8);
  const descBoxHeight = descLines.length * 5 + 8;
  ensureSpace(descBoxHeight + 10);
  doc.setDrawColor(...SLATE_LIGHT);
  doc.roundedRect(marginX, y, contentWidth, descBoxHeight, 2, 2, 'S');
  doc.text(descLines, marginX + 4, y + 7);
  y += descBoxHeight + 8;

  const drawImageGrid = async (label: string, urls: string[]) => {
    if (!urls || urls.length === 0) return;
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_MID);
    doc.text(`${label.toUpperCase()} (${urls.length})`, marginX, y);
    y += 5;

    const perRow = 4;
    const gap = 3;
    const imgSize = (contentWidth - gap * (perRow - 1)) / perRow;
    let col = 0;
    for (const url of urls) {
      ensureSpace(imgSize + 4);
      const cx = marginX + col * (imgSize + gap);
      const loaded = await loadImageAsDataUrl(url);
      doc.setDrawColor(...SLATE_LIGHT);
      doc.roundedRect(cx, y, imgSize, imgSize, 1.5, 1.5, 'S');
      if (loaded) {
        const ratio = loaded.width / loaded.height;
        const drawW = ratio > 1 ? imgSize : imgSize * ratio;
        const drawH = ratio > 1 ? imgSize / ratio : imgSize;
        doc.addImage(loaded.dataUrl, 'JPEG', cx + (imgSize - drawW) / 2, y + (imgSize - drawH) / 2, drawW, drawH);
      } else {
        doc.setFontSize(7);
        doc.setTextColor(...SLATE_MID);
        doc.text('Image unavailable', cx + imgSize / 2, y + imgSize / 2, { align: 'center', maxWidth: imgSize - 4 });
      }
      col++;
      if (col >= perRow) {
        col = 0;
        y += imgSize + gap;
      }
    }
    if (col !== 0) y += imgSize + gap;
    y += 4;
  };

  await drawImageGrid('Attached Evidence Photos', ticket.images);

  if (ticket.status === 'Closed') {
    ensureSpace(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.text('RESOLUTION & CLOSURE DETAILS', marginX, y + 5);
    if (ticket.resolvedAt) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...SLATE_MID);
      doc.text(ticket.resolvedAt, pageWidth - marginX, y + 5, { align: 'right' });
    }
    y += 10;

    doc.setFontSize(9);
    doc.setTextColor(...SLATE_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text('Action Taken:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.actionTaken || 'Resolved & Settled', marginX + 26, y, { maxWidth: contentWidth / 2 - 30 });
    if (ticket.resolvedBy) {
      doc.setFont('helvetica', 'bold');
      doc.text('Resolved By:', marginX + contentWidth / 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(ticket.resolvedBy, marginX + contentWidth / 2 + 24, y);
    }
    y += 7;

    if (ticket.resolutionRemarks) {
      const remLines = doc.splitTextToSize(ticket.resolutionRemarks, contentWidth - 8);
      const remH = remLines.length * 5 + 6;
      ensureSpace(remH + 4);
      doc.setDrawColor(167, 243, 208);
      doc.roundedRect(marginX, y, contentWidth, remH, 2, 2, 'S');
      doc.setTextColor(...SLATE_DARK);
      doc.text(remLines, marginX + 4, y + 6);
      y += remH + 6;
    }

    await drawImageGrid('Resolution Proofs', ticket.resolutionImages || []);
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(...SLATE_LIGHT);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_MID);
    doc.text('Popular Paints & Chemicals — Sales Portal · Customer Grievance & Ticket Center', marginX, pageHeight - 9);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - marginX, pageHeight - 9, { align: 'right' });
  }

  return doc;
};

export const GrievanceModule: React.FC = () => {
  const { authState, showToast } = useAuth();
  const user = authState.user;
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  const [tickets, setTickets] = useState<GrievanceTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

  const handleDownloadTicketPdf = async (ticket: GrievanceTicket) => {
    setIsDownloadingPdf(true);
    try {
      const doc = await generateGrievanceTicketPdf(ticket);
      doc.save(`Grievance_${ticket.ticketNumber}.pdf`);
    } catch (err) {
      console.error('Ticket PDF generation failed:', err);
      showToast('error', 'Download Failed', 'Could not generate the ticket PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrintTicketPdf = async (ticket: GrievanceTicket) => {
    setIsPrintingPdf(true);
    try {
      const doc = await generateGrievanceTicketPdf(ticket);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch (err) {
      console.error('Ticket PDF print failed:', err);
      showToast('error', 'Print Failed', 'Could not prepare the ticket for printing.');
    } finally {
      setIsPrintingPdf(false);
    }
  };

  // View Mode: 'list' (default) or 'grid'
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [expandedTicketIds, setExpandedTicketIds] = useState<Record<string, boolean>>({});

  const toggleTicketExpand = (ticketId: string) => {
    setExpandedTicketIds(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }));
  };

  // Filters & Search
  const [activeTab, setActiveTab] = useState<'All' | GrievanceStatus>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>('All');
  const [activeDropdown, setActiveDropdown] = useState<'sales' | 'category' | 'priority' | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as any);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [activeDropdown]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedTicketForResolution, setSelectedTicketForResolution] = useState<GrievanceTicket | null>(null);
  const [selectedTicketForDetails, setSelectedTicketForDetails] = useState<GrievanceTicket | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  // Create Form State
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formContactNumber, setFormContactNumber] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCategory, setFormCategory] = useState<GrievanceCategory>('Product Quality');
  const [formPriority, setFormPriority] = useState<GrievancePriority>('Medium');
  const [formDescription, setFormDescription] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolve Form State
  const [resolveRemarks, setResolveRemarks] = useState('');
  const [resolveActionTaken, setResolveActionTaken] = useState('');
  const [resolveImages, setResolveImages] = useState<string[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  // Load Tickets
  const loadTickets = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await fetchGrievanceTicketsFromSheet();
      setTickets(data);
      if (isManual) {
        showToast('success', 'Tickets Updated', 'Latest customer grievance tickets loaded.');
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Helper for multiple file upload to base64
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImages: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        showToast('error', 'Invalid File', 'Only image files are supported.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        showToast('error', 'File Too Large', 'Please select images under 8MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setImages(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Submit New Grievance Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerName.trim() || !formContactNumber.trim() || !formDescription.trim()) {
      showToast('error', 'Required Fields', 'Please fill in Customer Name, Contact Number, and Description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await saveGrievanceTicketToSheet({
        salesPersonId: user?.id || 'sales01',
        salesPersonName: user?.userName || 'Sales Executive',
        customerName: formCustomerName.trim(),
        contactPerson: formContactPerson.trim(),
        contactNumber: formContactNumber.trim(),
        city: formCity.trim(),
        category: formCategory,
        priority: formPriority,
        description: formDescription.trim(),
        images: formImages,
      });

      setTickets(prev => [created, ...prev]);
      showToast('success', 'Ticket Raised Successfully', `Grievance Ticket #${created.ticketNumber} registered!`);

      // Reset form
      setFormCustomerName('');
      setFormContactPerson('');
      setFormContactNumber('');
      setFormCity('');
      setFormDescription('');
      setFormImages([]);
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error('Create ticket error:', err);
      showToast('error', 'Submission Failed', 'Could not save ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Ticket Resolution
  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForResolution) return;
    if (!resolveRemarks.trim()) {
      showToast('error', 'Remarks Required', 'Please enter resolution remarks.');
      return;
    }

    setIsResolving(true);
    try {
      const resolved = await resolveGrievanceTicketInSheet(selectedTicketForResolution.id, {
        remarks: resolveRemarks.trim(),
        actionTaken: resolveActionTaken.trim() || 'Resolved & Closed',
        images: resolveImages,
        resolvedBy: user?.userName || 'Administrator',
        resolvedById: user?.id || 'admin01',
      });

      if (resolved) {
        setTickets(prev =>
          prev.map(t => (t.id === resolved.id || t.ticketNumber === resolved.ticketNumber ? resolved : t))
        );
        showToast('success', 'Ticket Resolved & Closed', `Ticket #${resolved.ticketNumber} is now marked as Closed.`);
      }

      setIsResolveModalOpen(false);
      setSelectedTicketForResolution(null);
      setResolveRemarks('');
      setResolveActionTaken('');
      setResolveImages([]);
    } catch (err) {
      console.error('Resolve ticket error:', err);
      showToast('error', 'Action Failed', 'Could not close ticket. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  // Unique Sales Persons for filtering
  const salesPersonsList = Array.from(
    new Set(tickets.map(t => t.salesPersonName).filter(Boolean))
  ).sort();

  // Filtered Tickets
  const filteredTickets = tickets.filter(t => {
    // If not Admin/Manager, show only tickets raised by or assigned to this salesperson
    const matchesUser = isAdminOrManager
      ? true
      : (t.salesPersonId === user?.id || (t.salesPersonName || '').toLowerCase().trim().includes((user?.userName || user?.name || '').toLowerCase().trim()));
    
    const matchesTab = activeTab === 'All' ? true : t.status === activeTab;
    const matchesCategory = categoryFilter === 'All' ? true : t.category === categoryFilter;
    const matchesPriority = priorityFilter === 'All' ? true : t.priority === priorityFilter;
    const matchesSalesPerson = salesPersonFilter === 'All' ? true : t.salesPersonName === salesPersonFilter;

    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.ticketNumber.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.salesPersonName.toLowerCase().includes(q) ||
      t.contactNumber.includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.city || '').toLowerCase().includes(q);

    return matchesUser && matchesTab && matchesCategory && matchesPriority && matchesSalesPerson && matchesSearch;
  });

  // KPI Metrics
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status === 'Open').length;
  const inReviewCount = tickets.filter(t => t.status === 'In Review').length;
  const closedCount = tickets.filter(t => t.status === 'Closed').length;
  const resolutionRate = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Top Banner & Action */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border border-slate-700/70 py-2.5 sm:py-3.5 px-3.5 sm:px-5 transition-all">
        {/* Subtle English luxury accent glow */}
        <div className="absolute right-0 top-0 w-60 h-full bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 w-48 h-full bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          <div className="space-y-0.5 max-w-2xl">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <div className="p-1.5 sm:p-2 rounded-xl bg-slate-800 text-sky-400 border border-slate-700/80 shadow-xs flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h1 className="text-sm sm:text-lg lg:text-xl font-bold sm:font-extrabold text-white tracking-tight">
                Customer Grievance &amp; Ticket Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE HELPDESK</span>
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-300 font-normal leading-relaxed pl-0.5">
              Register dealer &amp; party product issues with multi-image evidence. Managers review, resolve, and close tickets with resolution proof.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-start md:self-center pt-0.5 md:pt-0">
            <button
              type="button"
              onClick={() => loadTickets(true)}
              disabled={isRefreshing}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800/90 text-slate-200 font-semibold text-[11px] sm:text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer shadow-xs"
              title="Refresh Tickets"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-md shadow-blue-600/30 hover:shadow-blue-600/40 transition-all cursor-pointer border border-blue-400/30"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span>Raise Ticket</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3.5 lg:gap-4.5">
        {/* Total Tickets */}
        <div className="relative overflow-hidden p-3 sm:p-4.5 lg:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30 border border-blue-200/90 dark:border-blue-900/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div>
              <p className="text-[10px] sm:text-[11px] font-extrabold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Total Tickets</p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-0.5 sm:mt-1">{totalCount}</h3>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xs sm:text-base shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform shrink-0">
              #
            </div>
          </div>
          <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">All logged customer issues</p>
        </div>

        {/* Open / Pending */}
        <div className="relative overflow-hidden p-3 sm:p-4.5 lg:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/30 border border-amber-200/90 dark:border-amber-900/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div>
              <p className="text-[10px] sm:text-[11px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Open / Pending</p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1">{openCount}</h3>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
          </div>
          <p className="hidden sm:block text-[11px] text-amber-700/90 dark:text-amber-400/90 mt-2 font-bold">
            {openCount > 0 ? `Action required on ${openCount} issue${openCount > 1 ? 's' : ''}` : 'No pending tickets'}
          </p>
        </div>

        {/* Resolved & Closed */}
        <div className="relative overflow-hidden p-3 sm:p-4.5 lg:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border border-emerald-200/90 dark:border-emerald-900/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div>
              <p className="text-[10px] sm:text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Resolved</p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-1">{closedCount}</h3>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
          </div>
          <p className="hidden sm:block text-[11px] text-emerald-700/90 dark:text-emerald-400/90 mt-2 font-bold">Successfully closed with proof</p>
        </div>

        {/* Resolution Rate */}
        <div className="relative overflow-hidden p-3 sm:p-4.5 lg:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-purple-50/80 via-white to-pink-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/30 border border-purple-200/90 dark:border-purple-900/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 bg-gradient-to-r from-purple-500 to-pink-500" />
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div>
              <p className="text-[10px] sm:text-[11px] font-extrabold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Resolution</p>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 mt-0.5 sm:mt-1">{resolutionRate}%</h3>
            </div>
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center font-black text-xs sm:text-base shadow-md shadow-purple-500/30 group-hover:scale-110 transition-transform shrink-0">
              %
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 sm:h-2 rounded-full overflow-hidden mt-1.5 sm:mt-2.5">
            <div
              className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${resolutionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar with View Switcher */}
      <div className="p-3.5 sm:p-4.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        {/* Top Filter Row: Status Tabs + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Status Tabs with smooth scroll on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar shrink-0">
            {(['All', 'Open', 'Closed'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab === 'All' ? 'All Tickets' : tab === 'Open' ? 'Open Issues' : 'Closed'}</span>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    activeTab === tab ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab === 'All' ? totalCount : tab === 'Open' ? openCount : closedCount}
                </span>
              </button>
            ))}
          </div>

          {/* View Switcher Toggle: List vs Grid */}
          <div className="flex items-center justify-end gap-1 p-0.5 sm:p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>
        </div>

        {/* Inputs: Search + Compact Filter Dropdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 pt-0.5">
          {/* Search Bar */}
          <div className="lg:col-span-4 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer, ticket #, mobile..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8.5 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Selects Grid */}
          <div ref={filterDropdownRef} className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-2 relative">
            {/* Sales Person Custom Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(prev => prev === 'sales' ? null : 'sales')}
                className={`w-full flex items-center justify-between pl-2.5 pr-2 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer truncate shadow-2xs ${
                  salesPersonFilter !== 'All'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400/80 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{salesPersonFilter === 'All' ? 'All Sales Reps' : salesPersonFilter}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${activeDropdown === 'sales' ? 'rotate-180 text-blue-500' : ''}`} />
              </button>

              <AnimatePresence>
                {activeDropdown === 'sales' && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[190px] max-w-[260px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1 text-slate-800 dark:text-slate-100 max-h-56 overflow-y-auto ring-1 ring-black/5 dark:ring-white/10"
                  >
                    <button
                      type="button"
                      onClick={() => { setSalesPersonFilter('All'); setActiveDropdown(null); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        salesPersonFilter === 'All' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>All Sales Reps</span>
                      {salesPersonFilter === 'All' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </button>
                    {salesPersonsList.map(sp => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => { setSalesPersonFilter(sp); setActiveDropdown(null); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          salesPersonFilter === sp ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{sp}</span>
                        {salesPersonFilter === sp && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category Custom Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveDropdown(prev => prev === 'category' ? null : 'category')}
                className={`w-full flex items-center justify-between pl-2.5 pr-2 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer truncate shadow-2xs ${
                  categoryFilter !== 'All'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400/80 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{categoryFilter === 'All' ? 'All Categories' : categoryFilter}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${activeDropdown === 'category' ? 'rotate-180 text-blue-500' : ''}`} />
              </button>

              <AnimatePresence>
                {activeDropdown === 'category' && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 sm:right-auto sm:left-0 top-full mt-1.5 z-50 w-full min-w-[210px] max-w-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1 text-slate-800 dark:text-slate-100 max-h-56 overflow-y-auto ring-1 ring-black/5 dark:ring-white/10"
                  >
                    <button
                      type="button"
                      onClick={() => { setCategoryFilter('All'); setActiveDropdown(null); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        categoryFilter === 'All' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>All Categories</span>
                      {categoryFilter === 'All' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </button>
                    {CATEGORIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setCategoryFilter(c); setActiveDropdown(null); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          categoryFilter === c ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{c}</span>
                        {categoryFilter === c && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Priority Custom Dropdown */}
            <div className="relative col-span-2 sm:col-span-1">
              <button
                type="button"
                onClick={() => setActiveDropdown(prev => prev === 'priority' ? null : 'priority')}
                className={`w-full flex items-center justify-between pl-2.5 pr-2 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer truncate shadow-2xs ${
                  priorityFilter !== 'All'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400/80 text-blue-700 dark:text-blue-300'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{priorityFilter === 'All' ? 'All Priorities' : `${priorityFilter} Priority`}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${activeDropdown === 'priority' ? 'rotate-180 text-blue-500' : ''}`} />
              </button>

              <AnimatePresence>
                {activeDropdown === 'priority' && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 sm:right-auto sm:left-0 top-full mt-1.5 z-50 w-full min-w-[170px] max-w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1 text-slate-800 dark:text-slate-100 max-h-56 overflow-y-auto ring-1 ring-black/5 dark:ring-white/10"
                  >
                    <button
                      type="button"
                      onClick={() => { setPriorityFilter('All'); setActiveDropdown(null); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        priorityFilter === 'All' ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span>All Priorities</span>
                      {priorityFilter === 'All' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </button>
                    {PRIORITIES.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setPriorityFilter(p); setActiveDropdown(null); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          priorityFilter === p ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>{p} Priority</span>
                        {priorityFilter === p && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Active Filters Clear Bar */}
        {(searchTerm || salesPersonFilter !== 'All' || categoryFilter !== 'All' || priorityFilter !== 'All' || activeTab !== 'All') && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Showing filtered results ({filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''})
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSalesPersonFilter('All');
                setCategoryFilter('All');
                setPriorityFilter('All');
                setActiveTab('All');
              }}
              className="text-blue-600 dark:text-sky-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Ticket Listing */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Loading customer grievance tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
            <HelpCircle className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Grievance Tickets Found</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            {searchTerm || categoryFilter !== 'All' || priorityFilter !== 'All' || salesPersonFilter !== 'All'
              ? 'No tickets match the selected filters. Try clearing search filters.'
              : 'All customer grievance queries are resolved. Click "Raise Grievance Ticket" to register a new one.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* ================= LIST VIEW (DEFAULT: INTERACTIVE ACCORDION ROWS) ================= */
        <div className="space-y-3">
          {filteredTickets.map(ticket => {
            const isClosed = ticket.status === 'Closed';
            const isUrgent = ticket.priority === 'Urgent';
            const isHigh = ticket.priority === 'High';
            const isExpanded = !!expandedTicketIds[ticket.id];

            return (
              <div
                key={ticket.id}
                className={`rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
                  isClosed
                    ? 'border-emerald-500/30'
                    : isUrgent
                    ? 'border-rose-500/40'
                    : 'border-slate-200/90 dark:border-slate-800'
                }`}
              >
                {/* Clickable Header Row */}
                <div
                  onClick={() => setSelectedTicketForDetails(ticket)}
                  className={`p-3.5 sm:p-4.5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors select-none ${
                    isExpanded ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                  }`}
                >
                  {/* Left: Indicator + Ticket # + Customer Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicketForDetails(ticket);
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-500 dark:text-slate-400 transition-colors shrink-0 cursor-pointer"
                      title="View Ticket Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-sky-400 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60">
                          {ticket.ticketNumber}
                        </span>

                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                            ticket.priority === 'Urgent'
                              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                              : ticket.priority === 'High'
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              : ticket.priority === 'Medium'
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {ticket.priority}
                        </span>

                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60">
                          {ticket.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-sky-400 transition-colors">
                          {ticket.customerName}
                        </h4>
                        {ticket.city && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-0.5 font-medium">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>{ticket.city}</span>
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                          <User className="w-3 h-3 text-indigo-500" />
                          <span>Raised by: <b className="text-slate-700 dark:text-slate-200">{ticket.salesPersonName}</b></span>
                        </span>
                        {isClosed && ticket.resolvedBy && (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/40">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span>Closed by: <b>{ticket.resolvedBy}</b></span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Images count + Status badge + Time + Expand prompt */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center flex-wrap">
                    {ticket.images && ticket.images.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        <span>{ticket.images.length} Evidence</span>
                      </span>
                    )}

                    <span
                      className={`inline-flex items-center gap-1 text-xs font-extrabold px-3 py-1 rounded-full border ${
                        isClosed
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {isClosed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      <span>{isClosed ? 'RESOLVED' : 'OPEN'}</span>
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                      {ticket.createdAt}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicketForDetails(ticket);
                      }}
                      className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline px-1 py-0.5 cursor-pointer flex items-center gap-1"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Animated Accordion Details */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="p-4 sm:p-5 space-y-4 bg-slate-50/40 dark:bg-slate-900/40">
                        {/* 3-Column Info Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5">
                            <Building2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Customer / Party Name</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{ticket.customerName}</p>
                              {ticket.contactPerson && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">Attn: {ticket.contactPerson}</p>
                              )}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5">
                            <Phone className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Contact &amp; Location</p>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{ticket.contactNumber}</p>
                              {ticket.city && (
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-rose-500" />
                                  <span>{ticket.city}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex items-start gap-2.5">
                            <User className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Raised By</p>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{ticket.salesPersonName}</p>
                              <p className="text-[10px] font-mono text-slate-400">{ticket.salesPersonId}</p>
                            </div>
                          </div>
                        </div>

                        {/* Issue Description */}
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Issue Description:</p>
                          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                            {ticket.description}
                          </p>
                        </div>

                        {/* Issue Photos Gallery */}
                        {ticket.images && ticket.images.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                              <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                              <span>Attached Issue Evidence ({ticket.images.length} Image{ticket.images.length > 1 ? 's' : ''}):</span>
                            </p>
                            <div className="flex items-center gap-3 flex-wrap">
                              {ticket.images.map((img, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => setActiveLightboxImage(img)}
                                  className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm hover:border-blue-500 transition-all shrink-0"
                                >
                                  <img src={img} alt={`Issue ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                    <Maximize2 className="w-4 h-4" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resolution Details Box (When Closed) */}
                        {isClosed && (
                          <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Resolution Details · Closed by {ticket.resolvedBy || 'Administrator'}</span>
                              </div>
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                {ticket.resolvedAt}
                              </span>
                            </div>

                            {ticket.actionTaken && (
                              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                                Action: <span className="font-medium text-slate-700 dark:text-slate-200">{ticket.actionTaken}</span>
                              </p>
                            )}

                            {ticket.resolutionRemarks && (
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                <span className="font-bold text-slate-900 dark:text-white">Closing Remarks: </span>
                                {ticket.resolutionRemarks}
                              </p>
                            )}

                            {/* Resolution Proof Images */}
                            {ticket.resolutionImages && ticket.resolutionImages.length > 0 && (
                              <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-1.5">
                                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Resolution Proof Attachments ({ticket.resolutionImages.length}):</span>
                                </p>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  {ticket.resolutionImages.map((img, idx) => (
                                    <div
                                      key={idx}
                                      onClick={() => setActiveLightboxImage(img)}
                                      className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-emerald-300 dark:border-emerald-700 cursor-pointer shadow-sm hover:border-emerald-500 transition-all shrink-0"
                                    >
                                      <img src={img} alt={`Resolution ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                        <Maximize2 className="w-4 h-4" />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons for Managers/Admins */}
                        {!isClosed && isAdminOrManager && (
                          <div className="pt-2 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicketForResolution(ticket);
                                setIsResolveModalOpen(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Resolve &amp; Close Ticket</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= GRID / CARD VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map(ticket => {
            const isClosed = ticket.status === 'Closed';
            const isUrgent = ticket.priority === 'Urgent';
            const isHigh = ticket.priority === 'High';

            return (
              <motion.div
                key={ticket.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedTicketForDetails(ticket)}
                className={`rounded-3xl bg-white dark:bg-slate-900 border transition-all p-4 sm:p-5 relative overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between cursor-pointer ${
                  isClosed
                    ? 'border-emerald-500/30 hover:border-emerald-500/60'
                    : isUrgent
                    ? 'border-rose-500/40 hover:border-rose-500/70'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50'
                }`}
              >
                <div>
                  {/* Header Bar of Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-blue-600 dark:text-sky-400 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60">
                        {ticket.ticketNumber}
                      </span>

                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-wider border ${
                          ticket.priority === 'Urgent'
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                            : ticket.priority === 'High'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : ticket.priority === 'Medium'
                            ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {ticket.priority} Priority
                      </span>

                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60">
                        {ticket.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full border ${
                          isClosed
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {isClosed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>{isClosed ? 'RESOLVED' : 'OPEN'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Main Body */}
                  <div className="py-3.5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Customer</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-sky-400 transition-colors">{ticket.customerName}</p>
                          {ticket.contactPerson && (
                            <p className="text-xs text-slate-500">Attn: {ticket.contactPerson}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Contact &amp; City</p>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{ticket.contactNumber}</p>
                          {ticket.city && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              <span>{ticket.city}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Raised By</p>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{ticket.salesPersonName}</p>
                          {isClosed && ticket.resolvedBy && (
                            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>Closed: {ticket.resolvedBy}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Problem Description */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Issue:</p>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed line-clamp-3">
                        {ticket.description}
                      </p>
                    </div>

                    {/* Issue Images */}
                    {ticket.images && ticket.images.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                          <span>Attached Evidence ({ticket.images.length}):</span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {ticket.images.map((img, idx) => (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveLightboxImage(img);
                              }}
                              className="relative group w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-500 transition-all shrink-0"
                            >
                              <img src={img} alt={`Issue ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Maximize2 className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolution Proof Box */}
                    {isClosed && (
                      <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                          <span>Resolved by {ticket.resolvedBy || 'Admin'}</span>
                          <span className="text-[10px] font-mono">{ticket.resolvedAt}</span>
                        </div>
                        {ticket.actionTaken && <p className="font-semibold text-emerald-900 dark:text-emerald-300">Action: {ticket.actionTaken}</p>}
                        {ticket.resolutionRemarks && <p className="text-slate-600 dark:text-slate-400">{ticket.resolutionRemarks}</p>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTicketForDetails(ticket);
                    }}
                    className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {!isClosed && isAdminOrManager && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicketForResolution(ticket);
                        setIsResolveModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Resolve &amp; Close Ticket</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL 1: RAISE GRIEVANCE TICKET ================= */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 text-slate-800 dark:text-slate-100 my-8 max-h-[90vh] overflow-y-auto slim-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      Raise Customer Grievance
                    </h3>
                    <p className="text-[11px] text-slate-400">Report product/delivery issue on behalf of customer</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                {/* Auto-Captured Creator / Salesperson */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-blue-600/30">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ticket Raised By (Logged-in)</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {user?.userName || 'Sales Executive'} <span className="text-[10px] font-semibold text-blue-600 dark:text-sky-400">({user?.role || 'Salesperson'})</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0 border border-blue-200 dark:border-blue-800">
                    Auto-Assigned
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Customer / Dealer / Party Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mahadev Paint Store"
                    value={formCustomerName}
                    onChange={e => setFormCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Sharma"
                      value={formContactPerson}
                      onChange={e => setFormContactPerson(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9826012345"
                      value={formContactNumber}
                      onChange={e => setFormContactNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      City / Area
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Indore / Bhopal"
                      value={formCity}
                      onChange={e => setFormCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={formPriority}
                      onChange={e => setFormPriority(e.target.value as GrievancePriority)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p}>{p} Priority</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Grievance Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as GrievanceCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Detailed Problem Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe batch number, damaged quantities, shade variation, leakage, etc."
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Multiple Image Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Attach Issue Photos / Invoices / Damage Proof (Multiple Upload)
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-blue-400/40 hover:border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold text-xs cursor-pointer transition-all">
                      <Upload className="w-4 h-4" />
                      <span>Select Multiple Images from Device</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={e => handleFileUpload(e, setFormImages)}
                        className="hidden"
                      />
                    </label>

                    {formImages.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {formImages.map((img, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 group">
                            <img src={img} alt="preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setFormImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs opacity-90 hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>Submit Grievance Ticket</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL 2: RESOLVE & CLOSE TICKET (MANAGER / ADMIN) ================= */}
      <AnimatePresence>
        {isResolveModalOpen && selectedTicketForResolution && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 text-slate-800 dark:text-slate-100 my-8 max-h-[90vh] overflow-y-auto slim-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      Resolve &amp; Close Ticket
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {selectedTicketForResolution.ticketNumber} · {selectedTicketForResolution.customerName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResolveTicket} className="space-y-4">
                {/* Auto-Captured Resolver / Admin Banner */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/70 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-emerald-600/30">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Closing &amp; Resolving As</p>
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {user?.userName || 'Administrator'} <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">({user?.role || 'Admin/Manager'})</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Raised By</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{selectedTicketForResolution.salesPersonName}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Action Taken Summary
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Replacement 5 Buckets Dispatched / Credit Note Issued"
                    value={resolveActionTaken}
                    onChange={e => setResolveActionTaken(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Resolution Remarks &amp; Closing Notes <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Explain how the grievance was addressed and agreed with the customer."
                    value={resolveRemarks}
                    onChange={e => setResolveRemarks(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Multiple Resolution Proof Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Attach Resolution Proofs (Dispatch Slip / Credit Note / Inspection Photos)
                  </label>

                  <div className="space-y-2">
                    <label className="flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-emerald-400/40 hover:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs cursor-pointer transition-all">
                      <Upload className="w-4 h-4" />
                      <span>Select Multiple Resolution Proof Images</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={e => handleFileUpload(e, setResolveImages)}
                        className="hidden"
                      />
                    </label>

                    {resolveImages.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {resolveImages.map((img, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 group">
                            <img src={img} alt="resolution preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setResolveImages(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs opacity-90 hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsResolveModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isResolving}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
                  >
                    {isResolving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Confirm &amp; Close Ticket</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: TICKET DETAILS POPUP ================= */}
      <AnimatePresence>
        {selectedTicketForDetails && (
          <div
            onClick={() => setSelectedTicketForDetails(null)}
            className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden my-auto"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/90 dark:to-slate-900">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-xs text-blue-600 dark:text-sky-400 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60">
                      {selectedTicketForDetails.ticketNumber}
                    </span>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg uppercase tracking-wider border ${
                        selectedTicketForDetails.priority === 'Urgent'
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                          : selectedTicketForDetails.priority === 'High'
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : selectedTicketForDetails.priority === 'Medium'
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {selectedTicketForDetails.priority} Priority
                    </span>

                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60">
                      {selectedTicketForDetails.category}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                        selectedTicketForDetails.status === 'Closed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {selectedTicketForDetails.status === 'Closed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{selectedTicketForDetails.status === 'Closed' ? 'RESOLVED' : 'OPEN'}</span>
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                    {selectedTicketForDetails.customerName}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicketForDetails(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content Scrollable Area */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-slate-800 dark:text-slate-200 text-xs">
                {/* 1. Customer & Contact Information */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-blue-500" />
                      <span>Party / Customer</span>
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {selectedTicketForDetails.customerName}
                    </p>
                    {selectedTicketForDetails.contactPerson && (
                      <p className="text-[11px] text-slate-500">Attn: {selectedTicketForDetails.contactPerson}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-500" />
                      <span>Contact &amp; City</span>
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {selectedTicketForDetails.contactNumber || 'N/A'}
                    </p>
                    {selectedTicketForDetails.city && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>{selectedTicketForDetails.city}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3 h-3 text-indigo-500" />
                      <span>Raised By</span>
                    </p>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {selectedTicketForDetails.salesPersonName}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {selectedTicketForDetails.createdAt}
                    </p>
                  </div>
                </div>

                {/* 2. Issue Description */}
                <div className="space-y-1.5">
                  <h5 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Grievance / Problem Description</span>
                  </h5>
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-normal">
                      {selectedTicketForDetails.description}
                    </p>
                  </div>
                </div>

                {/* 3. Attached Evidence Images */}
                {selectedTicketForDetails.images && selectedTicketForDetails.images.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                      <span>Attached Evidence Photos ({selectedTicketForDetails.images.length})</span>
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {selectedTicketForDetails.images.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveLightboxImage(img)}
                          className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 group cursor-pointer shadow-xs hover:shadow-md transition-all hover:scale-[1.02]"
                        >
                          <img
                            src={img}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 className="w-5 h-5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Resolution Proof & Remarks (If Closed) */}
                {selectedTicketForDetails.status === 'Closed' && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Resolution &amp; Closure Details</span>
                      {selectedTicketForDetails.resolvedAt && (
                        <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 font-mono ml-auto">
                          {selectedTicketForDetails.resolvedAt}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <p className="text-[10px] font-bold text-emerald-700/80 dark:text-emerald-400/80 uppercase">
                          Action Taken:
                        </p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {selectedTicketForDetails.actionTaken || 'Resolved & Settled'}
                        </p>
                      </div>

                      {selectedTicketForDetails.resolvedBy && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-700/80 dark:text-emerald-400/80 uppercase">
                            Resolved By:
                          </p>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {selectedTicketForDetails.resolvedBy}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedTicketForDetails.resolutionRemarks && (
                      <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/50 dark:border-emerald-800/50">
                        <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase mb-0.5">
                          Resolution Remarks:
                        </p>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-normal">
                          {selectedTicketForDetails.resolutionRemarks}
                        </p>
                      </div>
                    )}

                    {selectedTicketForDetails.resolutionImages && selectedTicketForDetails.resolutionImages.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">
                          Resolution Proofs ({selectedTicketForDetails.resolutionImages.length}):
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {selectedTicketForDetails.resolutionImages.map((img, idx) => (
                            <div
                              key={idx}
                              onClick={() => setActiveLightboxImage(img)}
                              className="relative aspect-square rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-800 group cursor-pointer shadow-xs hover:scale-[1.02] transition-transform"
                            >
                              <img
                                src={img}
                                alt={`Resolution Proof ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Maximize2 className="w-4 h-4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setSelectedTicketForDetails(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isPrintingPdf}
                    onClick={() => handlePrintTicketPdf(selectedTicketForDetails)}
                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                  >
                    {isPrintingPdf ? <RefreshCw className="w-4 h-4 animate-spin text-slate-500" /> : <Printer className="w-4 h-4 text-slate-500" />}
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    disabled={isDownloadingPdf}
                    onClick={() => handleDownloadTicketPdf(selectedTicketForDetails)}
                    className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                  >
                    {isDownloadingPdf ? <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> : <Download className="w-4 h-4 text-blue-600" />}
                    <span>Download</span>
                  </button>

                  {selectedTicketForDetails.status !== 'Closed' && isAdminOrManager && (
                    <button
                      type="button"
                      onClick={() => {
                        const t = selectedTicketForDetails;
                        setSelectedTicketForDetails(null);
                        setSelectedTicketForResolution(t);
                        setIsResolveModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Resolve &amp; Close Ticket</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL 3: FULL SCREEN IMAGE LIGHTBOX ================= */}
      <AnimatePresence>
        {activeLightboxImage && (
          <div
            onClick={() => setActiveLightboxImage(null)}
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <button
              type="button"
              onClick={() => setActiveLightboxImage(null)}
              className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={activeLightboxImage}
              alt="Full view"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Locale = "en" | "es";

const translations = {
  en: {
    // App
    appName: "Social Monitor",
    collapseSidebar: "Collapse sidebar",
    expandSidebar: "Expand sidebar",

    // Nav
    navDashboard: "Dashboard",
    navSources: "Sources",
    navPosts: "Posts",
    navTimeline: "Timeline",
    navTopicSets: "Topic Sets",
    navAlerts: "Alerts",
    navRuns: "Runs",
    navAuditLog: "Audit Log",
    navSettings: "Settings",

    // TopBar
    searchPlaceholder: "Search posts...",
    triggerIngestion: "Trigger Ingestion",
    alerts: "Alerts",

    // Dashboard
    totalSources: "Total Sources",
    totalPosts: "Total Posts",
    postsToday: "Posts Today",
    storageUsed: "Storage Used",
    recentActivity: "Recent Activity",
    noRecentPosts: "No recent posts.",
    ingestionTriggered: "Ingestion triggered successfully.",
    ingestionFailed: "Failed to trigger ingestion.",

    // Sources
    addSource: "Add Source",
    editSource: "Edit Source",
    platform: "Platform",
    user: "User",
    displayName: "Display Name",
    posts: "Posts",
    lastPolled: "Last Polled",
    active: "Active",
    actions: "Actions",
    loading: "Loading...",
    noSourcesYet: "No sources yet. Click \"Add Source\" to get started.",
    username: "Username",
    profileUrl: "Profile URL",
    pollIntervalSeconds: "Poll Interval (seconds)",
    cancel: "Cancel",
    saveChanges: "Save Changes",
    deleteSourceConfirm: "Delete this source? This cannot be undone.",
    failedDeleteSource: "Failed to delete source.",
    failedToggleSource: "Failed to toggle source.",
    never: "Never",

    // Source Detail
    backToSources: "Back to Sources",
    edit: "Edit",
    pollInterval: "Poll Interval",
    status: "Status",
    created: "Created",
    platformId: "Platform ID",
    statusActive: "Active",
    statusPaused: "Paused",
    postCount: "Post Count",
    noPostsFromSource: "No posts from this source yet.",
    save: "Save",
    failedSave: "Failed to save.",
    defaultPollInterval: "Default (60 min)",

    // Posts
    feedView: "Feed view",
    gridView: "Grid view",
    search: "Search",
    dateRange: "Date Range",
    hasMedia: "Has media",
    sort: "Sort",
    newestFirst: "Newest First",
    oldestFirst: "Oldest First",
    recentlyCollected: "Recently Collected",
    selected: "selected",
    addToSet: "Add to Set",
    noPostsFound: "No posts found.",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    original: "Original",

    // Post Detail
    backToPosts: "Back to Posts",
    postMetadata: "Post Metadata",
    platformLabel: "Platform",
    platformIdLabel: "Platform ID",
    posted: "Posted",
    archived: "Archived",
    mediaDownloaded: "Media Downloaded",
    mhtmlCaptured: "MHTML Captured",
    screenshot: "Screenshot",
    hashesComputed: "Hashes Computed",
    engagement: "Engagement",
    likes: "likes",
    shares: "shares",
    comments: "comments",
    views: "views",
    platformData: "Platform Data",
    topicSets: "Topic Sets",
    notInAnySets: "Not in any sets.",
    noSetsAvailable: "No sets available.",
    notes: "Notes",
    addNote: "Add a note...",
    add: "Add",
    rawJson: "Raw JSON",
    noMediaFiles: "No media files for this post.",
    failedAddNote: "Failed to add note.",
    failedAddToSet: "Failed to add to set.",
    yes: "Yes",
    no: "No",

    // Timeline
    chronologicalView: "Chronological view across all sources",
    from: "From",
    to: "To",
    all: "All",
    loadingTimeline: "Loading timeline...",
    noPostsToShow: "No posts to show",
    adjustFilters: "Adjust filters or ingest some posts first",
    unknownDate: "Unknown Date",
    media: "media",
    noText: "(no text)",

    // Topic Sets
    organizeByTopic: "Organize posts into topic-based collections",
    newSet: "New Set",
    createNewSet: "Create New Set",
    name: "Name",
    description: "Description",
    color: "Color",
    create: "Create",
    deleteSetConfirm: "Delete this set? Posts will not be deleted.",
    noTopicSetsYet: "No topic sets yet",
    createSetHint: "Create a set to start organizing posts by topic",
    post: "post",

    // Set Detail
    backToSets: "Back to Sets",
    zipArchive: "ZIP Archive",
    noPostsInSet: "No posts in this set yet. Add posts from the Posts page.",

    // Alerts
    getNotifiedKeywords: "Get notified when posts match your keywords",
    newAlert: "New Alert",
    createAlert: "Create Alert",
    keywordPattern: "Keyword / Regex Pattern",
    supportsRegex: "Supports regex patterns or plain text keywords",
    notifyVia: "Notify Via",
    browserNotification: "Browser Notification",
    webhook: "Webhook",
    webhookUrl: "Webhook URL",
    deleteAlertConfirm: "Delete this alert?",
    noAlertsConfigure: "No alerts configured",
    createAlertHint: "Create an alert to monitor for specific keywords",
    triggered: "triggered",
    pattern: "Pattern",

    // Runs
    ingestionRuns: "Ingestion Runs",
    historyOfRuns: "History of data collection runs",
    triggerAll: "Trigger All",
    statusLabel: "Status",
    trigger: "Trigger",
    found: "Found",
    new: "New",
    duration: "Duration",
    started: "Started",
    errors: "Errors",
    noIngestionRuns: "No ingestion runs yet",
    errorCount: "error(s)",

    // Audit Log
    auditLog: "Audit Log",
    immutableRecord: "Immutable record of all archival actions",
    allEvents: "All Events",
    postFirstSeen: "Post First Seen",
    mediaDownloadedEvent: "Media Downloaded",
    mhtmlCapturedEvent: "MHTML Captured",
    screenshotCaptured: "Screenshot Captured",
    hashesComputedEvent: "Hashes Computed",
    ingestionCompleted: "Ingestion Completed",
    downloadError: "Download Error",
    totalEvents: "total events",
    noAuditEvents: "No audit events yet",
    auditEventsHint: "Events will appear here as posts are ingested and archived",

    // Storage / Settings
    storageManagement: "Storage Management",
    driveTotal: "Drive Total",
    used: "Used",
    freeSpace: "Free Space",
    archiveSize: "Archive Size",
    byPlatform: "By Platform",
    byMediaType: "By Media Type",
    retentionPolicies: "Retention Policies",
    addPolicy: "Add Policy",
    scope: "Scope",
    global: "Global",
    source: "Source",
    maxAgeDays: "Max Age (days)",
    action: "Action",
    deleteMediaOnly: "Delete Media Only",
    deleteEverything: "Delete Everything",
    compress: "Compress",
    noRetentionPolicies: "No retention policies configured",
    deleteRetentionConfirm: "Delete this retention policy?",
    noDataYet: "No data yet",

    // Media Viewer
    images: "Images",
    video: "Video",
    mhtmlArchive: "MHTML Archive",

    // Pagination
    showing: "Showing",

    // Language
    language: "Language",
    english: "English",
    spanish: "Español",
  },
  es: {
    // App
    appName: "Monitor Social",
    collapseSidebar: "Contraer barra lateral",
    expandSidebar: "Expandir barra lateral",

    // Nav
    navDashboard: "Panel",
    navSources: "Fuentes",
    navPosts: "Publicaciones",
    navTimeline: "Línea de Tiempo",
    navTopicSets: "Conjuntos",
    navAlerts: "Alertas",
    navRuns: "Ejecuciones",
    navAuditLog: "Registro",
    navSettings: "Configuración",

    // TopBar
    searchPlaceholder: "Buscar publicaciones...",
    triggerIngestion: "Iniciar Recopilación",
    alerts: "Alertas",

    // Dashboard
    totalSources: "Total de Fuentes",
    totalPosts: "Total de Publicaciones",
    postsToday: "Publicaciones de Hoy",
    storageUsed: "Almacenamiento",
    recentActivity: "Actividad Reciente",
    noRecentPosts: "No hay publicaciones recientes.",
    ingestionTriggered: "Recopilación iniciada con éxito.",
    ingestionFailed: "Error al iniciar la recopilación.",

    // Sources
    addSource: "Agregar Fuente",
    editSource: "Editar Fuente",
    platform: "Plataforma",
    user: "Usuario",
    displayName: "Nombre",
    posts: "Publicaciones",
    lastPolled: "Última Consulta",
    active: "Activo",
    actions: "Acciones",
    loading: "Cargando...",
    noSourcesYet: "Aún no hay fuentes. Haz clic en \"Agregar Fuente\" para comenzar.",
    username: "Nombre de usuario",
    profileUrl: "URL de Perfil",
    pollIntervalSeconds: "Intervalo de consulta (segundos)",
    cancel: "Cancelar",
    saveChanges: "Guardar Cambios",
    deleteSourceConfirm: "¿Eliminar esta fuente? Esta acción no se puede deshacer.",
    failedDeleteSource: "Error al eliminar la fuente.",
    failedToggleSource: "Error al cambiar el estado de la fuente.",
    never: "Nunca",

    // Source Detail
    backToSources: "Volver a Fuentes",
    edit: "Editar",
    pollInterval: "Intervalo",
    status: "Estado",
    created: "Creado",
    platformId: "ID de Plataforma",
    statusActive: "Activo",
    statusPaused: "Pausado",
    postCount: "Total de Publicaciones",
    noPostsFromSource: "Aún no hay publicaciones de esta fuente.",
    save: "Guardar",
    failedSave: "Error al guardar.",
    defaultPollInterval: "Predeterminado (60 min)",

    // Posts
    feedView: "Vista de lista",
    gridView: "Vista de cuadrícula",
    search: "Buscar",
    dateRange: "Rango de Fechas",
    hasMedia: "Con medios",
    sort: "Ordenar",
    newestFirst: "Más recientes",
    oldestFirst: "Más antiguos",
    recentlyCollected: "Recopilados recientemente",
    selected: "seleccionadas",
    addToSet: "Agregar a Conjunto",
    noPostsFound: "No se encontraron publicaciones.",
    previous: "Anterior",
    next: "Siguiente",
    page: "Página",
    of: "de",
    original: "Original",

    // Post Detail
    backToPosts: "Volver a Publicaciones",
    postMetadata: "Metadatos de Publicación",
    platformLabel: "Plataforma",
    platformIdLabel: "ID de Plataforma",
    posted: "Publicado",
    archived: "Archivado",
    mediaDownloaded: "Medios Descargados",
    mhtmlCaptured: "MHTML Capturado",
    screenshot: "Captura de Pantalla",
    hashesComputed: "Hashes Calculados",
    engagement: "Interacción",
    likes: "me gusta",
    shares: "compartidos",
    comments: "comentarios",
    views: "visualizaciones",
    platformData: "Datos de Plataforma",
    topicSets: "Conjuntos Temáticos",
    notInAnySets: "No está en ningún conjunto.",
    noSetsAvailable: "No hay conjuntos disponibles.",
    notes: "Notas",
    addNote: "Agregar una nota...",
    add: "Agregar",
    rawJson: "JSON en Bruto",
    noMediaFiles: "Sin archivos multimedia para esta publicación.",
    failedAddNote: "Error al agregar nota.",
    failedAddToSet: "Error al agregar al conjunto.",
    yes: "Sí",
    no: "No",

    // Timeline
    chronologicalView: "Vista cronológica de todas las fuentes",
    from: "Desde",
    to: "Hasta",
    all: "Todos",
    loadingTimeline: "Cargando línea de tiempo...",
    noPostsToShow: "No hay publicaciones para mostrar",
    adjustFilters: "Ajusta los filtros o recopila publicaciones primero",
    unknownDate: "Fecha Desconocida",
    media: "medios",
    noText: "(sin texto)",

    // Topic Sets
    organizeByTopic: "Organiza publicaciones en colecciones temáticas",
    newSet: "Nuevo Conjunto",
    createNewSet: "Crear Nuevo Conjunto",
    name: "Nombre",
    description: "Descripción",
    color: "Color",
    create: "Crear",
    deleteSetConfirm: "¿Eliminar este conjunto? Las publicaciones no se eliminarán.",
    noTopicSetsYet: "Aún no hay conjuntos temáticos",
    createSetHint: "Crea un conjunto para organizar publicaciones por tema",
    post: "publicación",

    // Set Detail
    backToSets: "Volver a Conjuntos",
    zipArchive: "Archivo ZIP",
    noPostsInSet: "Aún no hay publicaciones en este conjunto. Agrega publicaciones desde la página de Publicaciones.",

    // Alerts
    getNotifiedKeywords: "Recibe notificaciones cuando una publicación coincida con tus palabras clave",
    newAlert: "Nueva Alerta",
    createAlert: "Crear Alerta",
    keywordPattern: "Palabra clave / Patrón Regex",
    supportsRegex: "Admite patrones regex o palabras clave de texto simple",
    notifyVia: "Notificar por",
    browserNotification: "Notificación del Navegador",
    webhook: "Webhook",
    webhookUrl: "URL del Webhook",
    deleteAlertConfirm: "¿Eliminar esta alerta?",
    noAlertsConfigure: "Aún no hay alertas configuradas",
    createAlertHint: "Crea una alerta para monitorear palabras clave específicas",
    triggered: "activaciones",
    pattern: "Patrón",

    // Runs
    ingestionRuns: "Ejecuciones de Recopilación",
    historyOfRuns: "Historial de ejecuciones de recopilación de datos",
    triggerAll: "Ejecutar Todas",
    statusLabel: "Estado",
    trigger: "Origen",
    found: "Encontradas",
    new: "Nuevas",
    duration: "Duración",
    started: "Inicio",
    errors: "Errores",
    noIngestionRuns: "Aún no hay ejecuciones de recopilación",
    errorCount: "errores",

    // Audit Log
    auditLog: "Registro de Auditoría",
    immutableRecord: "Registro inmutable de todas las acciones de archivado",
    allEvents: "Todos los Eventos",
    postFirstSeen: "Publicación Detectada",
    mediaDownloadedEvent: "Medios Descargados",
    mhtmlCapturedEvent: "MHTML Capturado",
    screenshotCaptured: "Captura de Pantalla",
    hashesComputedEvent: "Hashes Calculados",
    ingestionCompleted: "Recopilación Completada",
    downloadError: "Error de Descarga",
    totalEvents: "eventos totales",
    noAuditEvents: "Aún no hay eventos de auditoría",
    auditEventsHint: "Los eventos aparecerán aquí cuando se recopilen y archiven publicaciones",

    // Storage / Settings
    storageManagement: "Gestión de Almacenamiento",
    driveTotal: "Total del Disco",
    used: "Usado",
    freeSpace: "Espacio Libre",
    archiveSize: "Tamaño del Archivado",
    byPlatform: "Por Plataforma",
    byMediaType: "Por Tipo de Medio",
    retentionPolicies: "Políticas de Retención",
    addPolicy: "Agregar Política",
    scope: "Alcance",
    global: "Global",
    source: "Fuente",
    maxAgeDays: "Antigüedad Máxima (días)",
    action: "Acción",
    deleteMediaOnly: "Eliminar Solo Medios",
    deleteEverything: "Eliminar Todo",
    compress: "Comprimir",
    noRetentionPolicies: "Aún no hay políticas de retención configuradas",
    deleteRetentionConfirm: "¿Eliminar esta política de retención?",
    noDataYet: "Aún no hay datos",

    // Media Viewer
    images: "Imágenes",
    video: "Video",
    mhtmlArchive: "Archivo MHTML",

    // Pagination
    showing: "Mostrando",

    // Language
    language: "Idioma",
    english: "English",
    spanish: "Español",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("sm-locale") as Locale | null;
    if (saved && (saved === "en" || saved === "es")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("sm-locale", l);
  };

  const t = (key: TranslationKey): string => {
    return translations[locale][key] ?? translations.en[key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

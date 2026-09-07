import { ESystemLanguage } from "@/types/enums";

export interface WidgetTranslations {
  welcome: string;
  typeMessage: string;
  send: string;
  sendVoice: string;
  error: string;
  errorTitle: string;
  loading: string;
  connected: string;
  groupTitle: string;
  groupDescription: string;
  joinButton: string;
  leaveButton: string;
  messageComposerPlaceholder: string;
  sendMessage: string;
  leadFormTitle: string;
  leadFormName: string;
  leadFormEmail: string;
  leadFormPhone: string;
  leadFormMessage: string;
  leadFormSubmit: string;
  leadFormSuccess: string;
  notesTitle: string;
  notesAdd: string;
  notesEmpty: string;
  leadFormNamePlaceholder: string;
  leadFormEmailPlaceholder: string;
  leadFormPhonePlaceholder: string;
  leadFormNotePlaceholder: string;
  leadFormSubmitting: string;
  leadFormSuccessDesc: string;
  leadFormNameRequired: string;
  leadFormEmailInvalid: string;
  leadFormError: string;
  backToChat: string;
  clearSearch: string;
  contactSupport: string;
  createNoteTitle: string;
  createNewNote: string;
  currentAccount: string;
  deleteNoteActionWill: string;
  deleteNoteDesc: string;
  deleteNoteTitle: string;
  deleteNoteWarning1: string;
  deleteNoteWarning2: string;
  deleteNoteWarning3: string;
  editNoteTitle: string;
  checkingGroupAccess: string;
  groupChatProRequiredTitle: string;
  groupChatProRequiredDesc: string;
  groupChatProRequiredHint: string;
  backToAiChat: string;
  aiAssistant: string;
  defaultMember: string;
  you: string;
  canManageNotesTooltip: string;
  canExportReportTooltip: string;
  exportReportDesc: string;
  groupLockedFooter: string;
  groupPausedBanner: string;
  inviteLoginPrompt: string;
  inviteRequiredDesc: string;
  inviteRequiredTitle: string;
  loginAccount: string;
  messageDeleted: string;
  messagePinnedToNotes: string;
  needHelp: string;
  noHistoryMessages: string;
  noteContent: string;
  noteContentRequired: string;
  noteContentTooLong: string;
  noteTitle: string;
  noteTitlePlaceholder: string;
  noteTitleRequired: string;
  noteTitleTooLong: string;
  notesHistory: string;
  pinToGroupNotes: string;
  replyMessage: string;
  reportDownloadButton: string;
  reportExportDateLabel: string;
  reportRequesterLabel: string;
  reportTemplateLabel: string;
  switchAccount: string;
  viewDetails: string;
  voiceRecognitionSuccess: string;
  noteContentPlaceholder: string;
  noteAiFormatting: string;
  noteFormatHelp: string;
  saveChanges: string;
  createAndPin: string;
  chatHistory: string;
  copyLink: string;
  linkCopied: string;
  linkCopiedDesc: string;
  copyFailed: string;
  copyFailedDesc: string;
  copyMessage: string;
  voiceMessage: string;
  stopRecording: string;
  listening: string;
  shareChat: string;
  shareBotWithCustomers: string;
  createQrCode: string;
  hideQrCode: string;
  alwaysAvailable: string;
  outOfCredits: string;
  botOutOfCredits: string;
  notReady: string;
  messageTooLong: string;
  maintenance: string;
  offlineQueued: string;
  connectionTrouble: string;
  membersCount: string;
  groupMembers: string;
  groupNotes: string;
  groupInfo: string;
  unreadMessages: string;
  noGroupMessages: string;
  firstMessagePrompt: string;
  loadingGroupChat: string;
  groupNotAvailable: string;
  groupNotAvailableDesc: string;
  replyingTo: string;
  cancelReply: string;
  enableAiReply: string;
  disableAiReply: string;
  pinned: string;
  unpin: string;
  repin: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  close: string;
  stay: string;
  confirmLeave: string;
  leaveGroupTitle: string;
  leaveGroupDesc: string;
  exportReport: string;
  searchNotes: string;
  allNotes: string;
  todayNotes: string;
  sevenDaysNotes: string;
  pickDate: string;
  noMatchingNotes: string;
  resetFilter: string;
  newBadge: string;
  deviceError: string;
  voiceRecognitionError: string;
  voiceRecognitionFallback: string;
  loadOlderMessages: string;
  loadingOlderMessages: string;
  botCreditWarning: string;
  savedToNotes: string;
  deletedMessage: string;
  scrollToBottom: string;

  // Rate Limits & Bot Status
  dailyLimitBot: string;
  dailyLimitUser: string;
  dailyLimitFallback: string;
  botNotReadyWait: string;

  // Notifications & Auth
  notificationTitle: string;
  emailLinkUsedDesc: string;
  linkExpiredTitle: string;
  linkExpiredDesc: string;

  // Note Action Results
  pinNoteSuccess: string;
  pinNoteError: string;
  unpinNoteSuccess: string;
  unpinNoteError: string;
  updateNoteSuccess: string;
  createNoteSuccess: string;
  saveNoteError: string;
  saveNoteErrorTitle: string;
  deleteNoteSuccess: string;
  deleteNoteError: string;
  messageAlreadySaved: string;
  messageSavedSuccess: string;
  messageSaveError: string;
  messageAlreadyInNotes: string;
  insufficientCreditsNoteError: string;

  // Language Names (for UI badges)
  langArabic: string;
  langVietnamese: string;
  langEnglish: string;
  langJapanese: string;
  langKorean: string;
  langChinese: string;
  langFrench: string;
  langGerman: string;
  langSpanish: string;
}

const WIDGET_TRANSLATIONS: Record<ESystemLanguage, WidgetTranslations> = {
  [ESystemLanguage.Vi]: {
    welcome: "Xin chào! Tôi có thể giúp gì cho bạn?",
    typeMessage: "Nhập tin nhắn...",
    send: "Gửi",
    sendVoice: "Gửi tin nhắn thoại",
    error: "Đã xảy ra lỗi. Vui lòng thử lại.",
    errorTitle: "Lỗi",
    loading: "Đang tải...",
    connected: "Đã kết nối",
    groupTitle: "Chat nhóm",
    groupDescription: "Tham gia cuộc trò chuyện nhóm",
    joinButton: "Tham gia",
    leaveButton: "Rời nhóm",
    messageComposerPlaceholder: "Nhập tin nhắn...",
    sendMessage: "Gửi tin nhắn",
    leadFormTitle: "Để lại thông tin",
    leadFormName: "Họ và tên",
    leadFormEmail: "Email",
    leadFormPhone: "Số điện thoại",
    leadFormMessage: "Nội dung",
    leadFormSubmit: "Gửi thông tin",
    leadFormSuccess: "Cảm ơn bạn đã liên hệ!",
    notesTitle: "Ghi chú",
    notesAdd: "Thêm ghi chú",
    notesEmpty: "Chưa có ghi chú nào",
    leadFormNamePlaceholder: "Họ và tên *",
    leadFormEmailPlaceholder: "Email *",
    leadFormPhonePlaceholder: "Số điện thoại",
    leadFormNotePlaceholder: "Ghi chú thêm",
    leadFormSubmitting: "Đang gửi...",
    leadFormSuccessDesc:
      "Thông tin của bạn đã được gửi thành công. Đội ngũ hỗ trợ sẽ liên hệ với bạn sớm nhất!",
    leadFormNameRequired: "Vui lòng nhập tên của bạn (ít nhất 2 ký tự)",
    leadFormEmailInvalid: "Vui lòng nhập email hợp lệ",
    leadFormError: "Có lỗi xảy ra, vui lòng thử lại sau",
    noteContentPlaceholder: "Nhập nội dung ghi chú...",
    backToChat: "Quay lại chat",
    clearSearch: "Xóa tìm kiếm",
    contactSupport: "Liên hệ hỗ trợ",
    createNoteTitle: "Tạo ghi chú mới",
    createNewNote: "Tạo ghi chú mới",
    currentAccount: "Tài khoản hiện tại",
    deleteNoteActionWill: "Hành động này sẽ",
    deleteNoteDesc:
      "Xóa vĩnh viễn ghi chú và mọi bình luận liên quan. Hành động này không thể hoàn tác.",
    deleteNoteTitle: "Xóa ghi chú?",
    deleteNoteWarning1:
      "Việc xóa sẽ không thể hoàn tác. Bạn sẽ mất vĩnh viễn toàn bộ nội dung ghi chú.",
    deleteNoteWarning2:
      "Mọi bình luận, đánh giá hoặc phản hồi liên quan đến ghi chú này sẽ bị xóa.",
    deleteNoteWarning3: "Nếu ghi chú này đang được ghim, nó sẽ ngừng hiển thị trong nhóm.",
    editNoteTitle: "Chỉnh sửa ghi chú",
    checkingGroupAccess: "Đang kiểm tra quyền truy cập nhóm...",
    groupChatProRequiredTitle: "Tính năng Nhóm chat chưa khả dụng",
    groupChatProRequiredDesc:
      "Nhóm chat với AI của {name} là tính năng nâng cao chỉ khả dụng cho các chatbot thuộc gói Pro hoặc Enterprise.",
    groupChatProRequiredHint:
      "Vui lòng liên hệ quản trị viên không gian làm việc để nâng cấp gói dịch vụ.",
    backToAiChat: "Về trang Chat AI",
    aiAssistant: "Trợ lý AI",
    defaultMember: "Thành viên",
    you: "Bạn",
    canManageNotesTooltip: "Có quyền quản lý & tạo ghi chú",
    canExportReportTooltip: "Có quyền xuất báo cáo",
    exportReportDesc: "Tạo tài liệu tổng hợp bot",
    groupLockedFooter: "Nhóm đã bị khóa bởi quản trị viên.",
    groupPausedBanner: "Nhóm chat đang tạm dừng hoạt động.",
    inviteLoginPrompt: "Hãy đăng nhập để tham gia nhóm chat này.",
    inviteRequiredDesc: "Bạn cần được mời vào nhóm để tham gia cuộc trò chuyện này.",
    inviteRequiredTitle: "Yêu cầu lời mời",
    loginAccount: "Đăng nhập",
    messageDeleted: "Đã xóa",
    messagePinnedToNotes: "Đã ghim vào ghi chú",
    needHelp: "Cần trợ giúp?",
    noHistoryMessages: "Chưa có tin nhắn nào trước đây.",
    noteContent: "Nội dung",
    noteContentRequired: "Nội dung không được để trống.",
    noteContentTooLong: "Nội dung quá dài (tối đa 2000 ký tự).",
    noteTitle: "Tiêu đề",
    noteTitlePlaceholder: "Nhập tiêu đề...",
    noteTitleRequired: "Tiêu đề không được để trống.",
    noteTitleTooLong: "Tiêu đề quá dài (tối đa 120 ký tự).",
    notesHistory: "Lịch sử ghi chú",
    pinToGroupNotes: "Ghim vào ghi chú nhóm",
    replyMessage: "Trả lời",
    reportDownloadButton: "Tải báo cáo",
    reportExportDateLabel: "Ngày xuất",
    reportRequesterLabel: "Người yêu cầu",
    reportTemplateLabel: "Mẫu báo cáo",
    switchAccount: "Đổi tài khoản",
    viewDetails: "Xem chi tiết",
    voiceRecognitionSuccess: "Đã nhận diện giọng nói.",
    noteAiFormatting: "Tạo ghi chú bằng AI",
    noteFormatHelp: "Ghi chú hỗ trợ định dạng Markdown cơ bản.",
    saveChanges: "Lưu thay đổi",
    createAndPin: "Tạo & Ghim",
    chatHistory: "Lịch sử trò chuyện",
    copyLink: "Sao chép liên kết",
    linkCopied: "Đã sao chép liên kết!",
    linkCopiedDesc: "Liên kết trang chat đã được lưu vào bộ nhớ tạm.",
    copyFailed: "Sao chép thất bại!",
    copyFailedDesc: "Vui lòng tự sao chép liên kết.",
    copyMessage: "Sao chép tin nhắn",
    voiceMessage: "Tin nhắn thoại",
    stopRecording: "Dừng ghi âm",
    listening: "Đang nghe...",
    shareChat: "Chia sẻ trang chat",
    shareBotWithCustomers: "Chia sẻ bot {name} với khách hàng của bạn",
    createQrCode: "Tạo QR Code",
    hideQrCode: "Ẩn QR Code",
    alwaysAvailable: "Luôn sẵn sàng hỗ trợ",
    outOfCredits: "Tạm dừng do hết credits",
    botOutOfCredits: "Bot đã hết credits",
    notReady: "Chưa sẵn sàng",
    messageTooLong: "Tin nhắn quá dài (tối đa {max} ký tự). Vui lòng rút gọn nội dung.",
    maintenance: "Hệ thống đang bảo trì. Vui lòng quay lại sau.",
    offlineQueued: "Tin nhắn đã được lưu và sẽ gửi khi có kết nối trở lại.",
    connectionTrouble: "Xin lỗi, hiện tôi đang gặp sự cố kết nối.",
    membersCount: "thành viên",
    groupMembers: "Thành viên nhóm",
    groupNotes: "Lịch sử ghi chú nhóm",
    groupInfo: "Thông tin nhóm",
    unreadMessages: "Tin nhắn chưa đọc",
    noGroupMessages: "Chưa có tin nhắn nào trong nhóm.",
    firstMessagePrompt: "Hãy gửi tin nhắn đầu tiên để trò chuyện cùng AI và các thành viên!",
    loadingGroupChat: "Đang tải cuộc trò chuyện nhóm...",
    groupNotAvailable: "Nhóm chat chưa khả dụng",
    groupNotAvailableDesc:
      "Vui lòng liên hệ người quản trị để tạo hoặc kích hoạt nhóm chat cho Bot này.",
    replyingTo: "Đang trả lời",
    cancelReply: "Hủy trả lời",
    enableAiReply: "Bật AI trả lời tự động",
    disableAiReply: "Tắt AI trả lời tự động",
    pinned: "Đang ghim",
    unpin: "Bỏ ghim",
    repin: "Ghim lại",
    edit: "Chỉnh sửa",
    delete: "Xóa",
    save: "Lưu thay đổi",
    cancel: "Hủy",
    close: "Đóng",
    stay: "Ở lại",
    confirmLeave: "Xác nhận rời",
    leaveGroupTitle: "Rời khỏi nhóm chat?",
    leaveGroupDesc:
      "Bạn có chắc chắn muốn rời khỏi nhóm chat này không? Sau khi rời nhóm, bạn sẽ không nhận được tin nhắn mới từ nhóm trừ khi được mời lại.",
    exportReport: "Xuất báo cáo",
    searchNotes: "Tìm kiếm ghi chú...",
    allNotes: "Tất cả",
    todayNotes: "Hôm nay",
    sevenDaysNotes: "7 ngày qua",
    pickDate: "Chọn ngày",
    noMatchingNotes: "Không tìm thấy ghi chú nào phù hợp.",
    resetFilter: "Đặt lại bộ lọc",
    newBadge: "Mới",
    deviceError: "Lỗi thiết bị",
    voiceRecognitionError: "Lỗi chuyển giọng nói",
    voiceRecognitionFallback: "Không thể nhận diện giọng nói của bạn, vui lòng thử lại.",
    loadOlderMessages: "Tự động tải khi cuộn lên (hoặc bấm để tải)",
    loadingOlderMessages: "Đang tải tin nhắn cũ...",
    botCreditWarning:
      "⚠️ Bot đã hết credits để phản hồi AI trong nhóm. Thành viên vẫn có thể gửi tin nhắn và trò chuyện bình thường.",
    savedToNotes: "Đã lưu vào ghi chú",
    deletedMessage: "Tin nhắn đã bị xóa",
    scrollToBottom: "Cuộn xuống tin nhắn mới nhất",

    dailyLimitBot: "{name} đã đạt giới hạn tin nhắn trong ngày.",
    dailyLimitUser: "Bạn đã đạt giới hạn tin nhắn trong ngày.",
    dailyLimitFallback: "Đã đạt giới hạn tin nhắn trong ngày.",
    botNotReadyWait: "{name} chưa sẵn sàng. Vui lòng đợi trong giây lát.",

    notificationTitle: "Thông báo",
    emailLinkUsedDesc:
      "Liên kết trong email đã được sử dụng trước đó. Bạn đã đăng nhập vào nhóm chat.",
    linkExpiredTitle: "Liên kết hết hạn",
    linkExpiredDesc:
      "Liên kết xác thực trong email đã được sử dụng hoặc đã hết hạn. Vui lòng đăng nhập bằng email của bạn.",

    pinNoteSuccess: "Ghi chú đã được ghim lên nhóm.",
    pinNoteError: "Không thể ghim ghi chú.",
    unpinNoteSuccess: "Ghi chú đã được chuyển vào lịch sử.",
    unpinNoteError: "Không thể bỏ ghim ghi chú.",
    updateNoteSuccess: "Nội dung ghi chú đã được cập nhật.",
    createNoteSuccess: "Ghi chú đã được lưu.",
    saveNoteError: "Không thể lưu ghi chú.",
    saveNoteErrorTitle: "Không thể lưu ghi chú",
    deleteNoteSuccess: "Ghi chú đã được xóa thành công.",
    deleteNoteError: "Không thể xóa ghi chú.",
    messageAlreadySaved: "Tin nhắn này đã được lưu vào ghi chú nhóm trước đó.",
    messageSavedSuccess: "Tin nhắn đã được chuyển thành ghi chú và nạp vào bộ não bot thành công.",
    messageSaveError: "Không thể lưu tin nhắn vào ghi chú.",
    messageAlreadyInNotes: "Tin nhắn này đã nằm trong danh sách ghi chú của nhóm.",
    insufficientCreditsNoteError:
      "Workspace không đủ credits để lưu ghi chú (cần 1 credit). Vui lòng nạp thêm credits.",

    langArabic: "Tiếng Ả Rập",
    langVietnamese: "Tiếng Việt",
    langEnglish: "English",
    langJapanese: "Tiếng Nhật",
    langKorean: "Tiếng Hàn",
    langChinese: "Tiếng Trung",
    langFrench: "Tiếng Pháp",
    langGerman: "Tiếng Đức",
    langSpanish: "Tiếng TBN",
  },
  [ESystemLanguage.En]: {
    welcome: "Hello! How can I help you?",
    typeMessage: "Type a message...",
    send: "Send",
    sendVoice: "Send voice message",
    error: "An error occurred. Please try again.",
    errorTitle: "Error",
    loading: "Loading...",
    connected: "Connected",
    groupTitle: "Group Chat",
    groupDescription: "Join the group conversation",
    joinButton: "Join",
    leaveButton: "Leave",
    messageComposerPlaceholder: "Type a message...",
    sendMessage: "Send message",
    leadFormTitle: "Leave your information",
    leadFormName: "Full name",
    leadFormEmail: "Email",
    leadFormPhone: "Phone number",
    leadFormMessage: "Message",
    leadFormSubmit: "Submit",
    leadFormSuccess: "Thank you for reaching out!",
    notesTitle: "Notes",
    notesAdd: "Add note",
    notesEmpty: "No notes yet",
    leadFormNamePlaceholder: "Full name *",
    leadFormEmailPlaceholder: "Email *",
    leadFormPhonePlaceholder: "Phone number",
    leadFormNotePlaceholder: "Additional notes",
    leadFormSubmitting: "Submitting...",
    leadFormSuccessDesc:
      "Your information has been submitted successfully. Our support team will reach out soon!",
    leadFormNameRequired: "Please enter your name (at least 2 characters)",
    leadFormEmailInvalid: "Please enter a valid email",
    leadFormError: "An error occurred, please try again later",
    noteContentPlaceholder: "Enter note content...",
    backToChat: "Back to chat",
    clearSearch: "Clear search",
    contactSupport: "Contact support",
    createNoteTitle: "Create new note",
    createNewNote: "Create new note",
    currentAccount: "Current account",
    deleteNoteActionWill: "This action will",
    deleteNoteDesc:
      "Permanently delete the note and all associated comments. This action cannot be undone.",
    deleteNoteTitle: "Delete note?",
    deleteNoteWarning1: "Deletion cannot be undone. You will permanently lose all note content.",
    deleteNoteWarning2: "Any comments, ratings, or replies related to this note will be deleted.",
    deleteNoteWarning3: "If this note is pinned, it will no longer be displayed in the group.",
    editNoteTitle: "Edit note",
    checkingGroupAccess: "Checking group access permissions...",
    groupChatProRequiredTitle: "AI Group Chat feature not available",
    groupChatProRequiredDesc:
      "AI Group Chat for {name} is an advanced feature available on Pro or Enterprise plans.",
    groupChatProRequiredHint: "Please contact your workspace administrator to upgrade your plan.",
    backToAiChat: "Back to AI Chat",
    aiAssistant: "AI Assistant",
    defaultMember: "Member",
    you: "You",
    canManageNotesTooltip: "Has permission to manage & create notes",
    canExportReportTooltip: "Has permission to export reports",
    exportReportDesc: "Generate bot summary document",
    groupLockedFooter: "The group has been locked by the administrator.",
    groupPausedBanner: "The group chat is currently paused.",
    inviteLoginPrompt: "Please sign in to join this group chat.",
    inviteRequiredDesc: "You need to be invited to the group to join this conversation.",
    inviteRequiredTitle: "Invitation required",
    loginAccount: "Sign in",
    messageDeleted: "Deleted",
    messagePinnedToNotes: "Pinned to notes",
    needHelp: "Need help?",
    noHistoryMessages: "No previous messages.",
    noteContent: "Content",
    noteContentRequired: "Content cannot be empty.",
    noteContentTooLong: "Content is too long (maximum 2000 characters).",
    noteTitle: "Title",
    noteTitlePlaceholder: "Enter title...",
    noteTitleRequired: "Title cannot be empty.",
    noteTitleTooLong: "Title is too long (maximum 120 characters).",
    notesHistory: "Notes History",
    pinToGroupNotes: "Pin to group notes",
    replyMessage: "Reply",
    reportDownloadButton: "Download Report",
    reportExportDateLabel: "Export Date",
    reportRequesterLabel: "Requester",
    reportTemplateLabel: "Report Template",
    switchAccount: "Switch account",
    viewDetails: "View details",
    voiceRecognitionSuccess: "Voice recognized.",
    noteAiFormatting: "Generate Note with AI",
    noteFormatHelp: "Notes support basic Markdown formatting.",
    saveChanges: "Save changes",
    createAndPin: "Create & Pin",
    chatHistory: "Chat History",
    copyLink: "Copy Link",
    linkCopied: "Link copied!",
    linkCopiedDesc: "Chat page link has been copied to clipboard.",
    copyFailed: "Copy failed!",
    copyFailedDesc: "Please copy the link manually.",
    copyMessage: "Copy message",
    voiceMessage: "Voice message",
    stopRecording: "Stop recording",
    listening: "Listening...",
    shareChat: "Share Chat Page",
    shareBotWithCustomers: "Share bot {name} with your customers",
    createQrCode: "Create QR Code",
    hideQrCode: "Hide QR Code",
    alwaysAvailable: "Always available to help",
    outOfCredits: "Paused due to insufficient credits",
    botOutOfCredits: "Bot is out of credits",
    notReady: "Not ready",
    messageTooLong: "Message is too long (maximum {max} characters). Please shorten your content.",
    maintenance: "System is under maintenance. Please come back later.",
    offlineQueued: "Message has been saved and will be sent when connection is restored.",
    connectionTrouble: "Sorry, I am having connection trouble right now.",
    membersCount: "members",
    groupMembers: "Group Members",
    groupNotes: "Group Notes History",
    groupInfo: "Group Info",
    unreadMessages: "Unread messages",
    noGroupMessages: "No messages in this group yet.",
    firstMessagePrompt: "Send the first message to start chatting with AI and other members!",
    loadingGroupChat: "Loading group chat...",
    groupNotAvailable: "Group chat is not available",
    groupNotAvailableDesc:
      "Please contact the administrator to create or activate the group chat for this bot.",
    replyingTo: "Replying to",
    cancelReply: "Cancel reply",
    enableAiReply: "Enable AI auto-reply",
    disableAiReply: "Disable AI auto-reply",
    pinned: "Pinned",
    unpin: "Unpin",
    repin: "Repin",
    edit: "Edit",
    delete: "Delete",
    save: "Save changes",
    cancel: "Cancel",
    close: "Close",
    stay: "Stay",
    confirmLeave: "Confirm leave",
    leaveGroupTitle: "Leave group chat?",
    leaveGroupDesc:
      "Are you sure you want to leave this group chat? You will not receive new messages unless invited again.",
    exportReport: "Export Report",
    searchNotes: "Search notes...",
    allNotes: "All",
    todayNotes: "Today",
    sevenDaysNotes: "Last 7 days",
    pickDate: "Pick date",
    noMatchingNotes: "No matching notes found.",
    resetFilter: "Reset filter",
    newBadge: "New",
    deviceError: "Device error",
    voiceRecognitionError: "Voice recognition error",
    voiceRecognitionFallback: "Could not recognize your voice, please try again.",
    loadOlderMessages: "Scroll up to load older messages (or click to load)",
    loadingOlderMessages: "Loading older messages...",
    botCreditWarning:
      "⚠️ Bot is out of credits for AI responses in this group. Members can still chat normally.",
    savedToNotes: "Saved to notes",
    deletedMessage: "Message has been deleted",
    scrollToBottom: "Scroll to latest message",

    dailyLimitBot: "{name} has reached the daily message limit.",
    dailyLimitUser: "You have reached the daily message limit.",
    dailyLimitFallback: "Daily message limit reached.",
    botNotReadyWait: "{name} is not ready yet. Please wait a moment.",

    notificationTitle: "Notification",
    emailLinkUsedDesc: "The email link was already used. You are logged into the group chat.",
    linkExpiredTitle: "Link expired",
    linkExpiredDesc:
      "The verification link in your email has expired or been used. Please log in with your email.",

    pinNoteSuccess: "Note has been pinned to the group.",
    pinNoteError: "Could not pin note.",
    unpinNoteSuccess: "Note moved to history.",
    unpinNoteError: "Could not unpin note.",
    updateNoteSuccess: "Note content has been updated.",
    createNoteSuccess: "Note has been saved.",
    saveNoteError: "Could not save note.",
    saveNoteErrorTitle: "Could not save note",
    deleteNoteSuccess: "Note deleted successfully.",
    deleteNoteError: "Could not delete note.",
    messageAlreadySaved: "This message was already saved to group notes.",
    messageSavedSuccess: "Message saved as note and indexed into bot brain.",
    messageSaveError: "Could not save message to note.",
    messageAlreadyInNotes: "This message is already in group notes.",
    insufficientCreditsNoteError:
      "Workspace out of credits to save note (requires 1 credit). Please top up credits.",

    langArabic: "Arabic",
    langVietnamese: "Vietnamese",
    langEnglish: "English",
    langJapanese: "Japanese",
    langKorean: "Korean",
    langChinese: "Chinese",
    langFrench: "French",
    langGerman: "German",
    langSpanish: "Spanish",
  },
};

export function getLocaleDateTag(locale: ESystemLanguage | string = ESystemLanguage.Vi): string {
  if (locale === "en" || locale === ESystemLanguage.En) return "en-US";
  return "vi-VN";
}

export function getWidgetTranslations(
  locale: ESystemLanguage | string = ESystemLanguage.Vi
): WidgetTranslations {
  const lang = (Object.values(ESystemLanguage) as string[]).includes(locale as string)
    ? (locale as ESystemLanguage)
    : ESystemLanguage.Vi;
  return WIDGET_TRANSLATIONS[lang] ?? WIDGET_TRANSLATIONS[ESystemLanguage.Vi];
}

export { WIDGET_TRANSLATIONS };

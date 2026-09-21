export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getFileIcon = (fileType) => {
  const icons = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    pdf: '📄',
    archive: '🗜️',
    document: '📝',
  };
  return icons[fileType] || '📁';
};

export const getFileTypeColor = (fileType) => {
  const colors = {
    image: 'text-amber-400',
    video: 'text-red-400',
    audio: 'text-emerald-400',
    pdf: 'text-red-400',
    archive: 'text-amber-400',
    document: 'text-indigo-400',
  };
  return colors[fileType] || 'text-blue-400';
};

export const truncate = (str, n = 30) => {
  if (!str) return '';
  return str.length > n ? str.substring(0, n - 1) + '…' : str;
};

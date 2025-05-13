export const getSafeImageUrl = (url) => {
    if (!url) return '/placeholder-news.jpg';
    
    try {
      // Используем бесплатный прокси сервис для проблемных изображений
      return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=800&h=450&fit=cover`;
    } catch {
      return '/placeholder-news.jpg';
    }
  };
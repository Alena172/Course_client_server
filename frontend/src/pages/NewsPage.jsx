import NewsFeed from '../components/NewsFeed';

const NewsPage = () => {
  return (
    <div style={{ maxWidth: 800, margin: 'auto' }}>
      <h2>Новости</h2>
      <NewsFeed />
    </div>
  );
};

export default NewsPage;




// import NewsFeed from '../components/NewsFeed';

// import Search from '../components/Search';
// import Recommendations from '../components/Recommendations';
// import RecentNews from '../components/RecentNews';
// import React, { useState, useEffect } from 'react';

// const NewsPage = () => {
//   const [searchResults, setSearchResults] = useState(null);

//   const handleSearchResults = (results) => {
//     setSearchResults(results);
//   };

//   return (
//     <div className="home-page">
//       <div className="search-section">
//         <Search onSearchResults={handleSearchResults} />
//       </div>

//       <div className="content-section">
//         {searchResults ? (
//           <div className="search-results">
//             <h2>Результаты поиска</h2>
//             {/* Здесь можно отобразить результаты поиска */}
//           </div>
//         ) : (
//           <>
//             <div className="recommendations-section">
//               <Recommendations />
//             </div>
//             <div className="recent-news-section">
//               <RecentNews />
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

// export default NewsPage;

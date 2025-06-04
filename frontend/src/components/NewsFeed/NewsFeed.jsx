import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchNews from '../SearchNews/SearchNews';
import Recommendations from '../Recommendations/Recommendations';
import LatestNews from '../LatestNews/LatestNews';
import './NewsFeed.css';

const NewsFeed = () => {
  const navigate = useNavigate();
  const [searchData, setSearchData] = useState({ query: '', results: [] });

  const handleSearch = (data) => {
    setSearchData({
      query: data.query || '',
      results: data.results || []
    });
  };

  const showRecommendations = !searchData.query && searchData.results.length === 0;

  return (
    <div>
      <SearchNews onSearch={handleSearch} />
      {showRecommendations && (
        <>
          <Recommendations />
          <LatestNews />
        </>
      )}
    </div>
  );
};

export default NewsFeed;



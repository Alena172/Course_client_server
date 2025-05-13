import React, { useState } from 'react';

const NewsForm = ({ onAdd }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const tagArray = tags.split(',').map(tag => tag.trim());
    onAdd({ title, content, tags: tagArray });
    setTitle('');
    setContent('');
    setTags('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <input
        type="text"
        placeholder="Заголовок"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea
        placeholder="Содержимое"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Теги (через запятую)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <button type="submit">Добавить новость</button>
    </form>
  );
};

export default NewsForm;

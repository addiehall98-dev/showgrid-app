import React, { useState, useEffect, useRef } from 'react';

export default function MovieSearchInput({ value, onChange, disabled, medium }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (!query || query.trim().length < 2 || disabled) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}&medium=${medium || 'movies'}`)
        .then(res => res.json())
        .then(data => {
          setSuggestions(data || []);
          setIsOpen((data || []).length > 0);
          setLoading(false);
        })
        .catch(err => {
          console.error('Search error:', err);
          setSuggestions([]);
          setLoading(false);
        });
    }, 300);

    return () => {
      clearTimeout(timer);
      setLoading(false);
    };
  }, [query, disabled, medium]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative w-full h-full" ref={dropdownRef}>
      <input
        type="text"
        placeholder="Type title..."
        disabled={disabled}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        className="w-full h-full bg-gray-700 hover:bg-gray-600 focus:bg-gray-600 text-white placeholder-gray-400 text-center text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 rounded px-2 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {isOpen && !disabled && (
        <ul className="absolute z-50 left-0 top-full mt-1 w-full min-w-[200px] bg-gray-900 border border-gray-700 rounded-md shadow-xl overflow-hidden max-h-60 overflow-y-auto text-left">
          {loading && (
            <li className="p-3 text-gray-400 text-sm text-center">Searching...</li>
          )}
          {!loading && suggestions.length === 0 && query.trim().length >= 2 && (
            <li className="p-3 text-gray-400 text-sm text-center">No results found</li>
          )}
          {suggestions.map((item) => (
            <li
              key={item.id}
              onClick={() => {
                setQuery(item.title);
                onChange(item.title);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 last:border-0 transition"
            >
              {item.poster ? (
                <img src={item.poster} alt={item.title} className="w-8 h-12 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-8 h-12 bg-gray-800 rounded flex items-center justify-center text-[8px] text-gray-500 flex-shrink-0">N/A</div>
              )}
              <div className="overflow-hidden flex-1">
                <p className="text-sm text-white font-medium truncate">{item.title}</p>
                <p className="text-xs text-gray-400">{item.year || 'N/A'}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

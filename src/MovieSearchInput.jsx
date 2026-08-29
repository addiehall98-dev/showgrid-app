import React, { useState, useEffect, useRef } from 'react';

export default function MovieSearchInput({ value, onChange, disabled, medium }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
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

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}&medium=${medium || 'movies'}`)
        .then(res => res.json())
        .then(data => {
          setSuggestions(data);
          setIsOpen(data.length > 0);
        })
        .catch(() => setSuggestions([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [query, disabled, medium]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        className="w-full h-full bg-transparent text-center text-xs text-white focus:outline-none focus:bg-gray-800 rounded p-1"
      />

      {isOpen && !disabled && (
        <ul className="absolute z-50 left-0 top-full mt-1 w-44 bg-gray-900 border border-gray-700 rounded-md shadow-xl overflow-hidden max-h-48 overflow-y-auto text-left">
          {suggestions.map((item) => (
            <li
              key={item.id}
              onClick={() => {
                setQuery(item.title);
                onChange(item.title);
                setIsOpen(false);
              }}
              className="flex items-center gap-2 p-2 hover:bg-gray-800 cursor-pointer border-b border-gray-800/50 last:border-0"
            >
              {item.poster ? (
                <img src={item.poster} alt={item.title} className="w-5 h-8 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-5 h-8 bg-gray-800 rounded flex items-center justify-center text-[8px] text-gray-500">N/A</div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs text-white font-medium truncate">{item.title}</p>
                <p className="text-[10px] text-gray-400">{item.year}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

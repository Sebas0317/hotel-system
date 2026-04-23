import { useMemo, useState, useCallback } from 'react';
import Fuse from 'fuse.js';

const fuseOptions = {
  keys: ['numero', 'huesped', 'documento', 'tipo', 'estado'],
  threshold: 0.3,
  ignoreLocation: true,
  findAllMatches: true,
};

export function useSearch(items, options = {}) {
  const [query, setQuery] = useState('');
  const [searchFields] = useState(options.keys || fuseOptions.keys);
  const [threshold] = useState(options.threshold || fuseOptions.threshold);

  const fuse = useMemo(() => {
    return new Fuse(items, { ...fuseOptions, keys: searchFields, threshold });
  }, [items, searchFields, threshold]);

  const results = useMemo(() => {
    if (!query.trim()) return items;
    return fuse.search(query).map(result => result.item);
  }, [query, fuse, items]);

  return {
    query,
    setQuery,
    results,
    clearQuery: useCallback(() => setQuery(''), []),
  };
}

export function useFuseSearch(items, options = {}) {
  const { keys = fuseOptions.keys, threshold = fuseOptions.threshold } = options;
  
  const fuseInstance = useMemo(() => {
    return new Fuse(items, { keys, threshold, ignoreLocation: true, findAllMatches: true });
  }, [items, keys, threshold]);

  const search = useCallback((searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return items;
    return fuseInstance.search(searchTerm).map(result => result.item);
  }, [fuseInstance, items]);

  return { search, fuse: fuseInstance };
}
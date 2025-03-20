import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Server {
  id: string;
  name: string;
  node?: {
    fqdn: string;
    port: number;
  };
  status?: {
    status?: {
      state: string;
    };
  };
}

export default function SearchBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [servers, setServers] = useState<Server[]>([]);
  const [filteredServers, setFilteredServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Fetch servers
  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch('/api/servers', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch servers');
        }
        
        const data = await response.json();
        setServers(data);
      } catch (err) {
        console.error('Error fetching servers:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchServers();
  }, []);

  // Filter servers based on query
  useEffect(() => {
    if (!query.trim()) {
      setFilteredServers(servers);
      return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = servers.filter(server => 
      server.name.toLowerCase().includes(lowerQuery) || 
      server.node?.fqdn.toLowerCase().includes(lowerQuery)
    );
    
    setFilteredServers(filtered);
    setSelectedIndex(0);
  }, [query, servers]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD+K or CTRL+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 10);
      }
      
      // ESC to close
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle navigation keys for selecting items
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredServers.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredServers.length > 0) {
      e.preventDefault();
      handleServerSelect(filteredServers[selectedIndex]);
    }
  };

  const handleServerSelect = (server: Server) => {
    navigate(`/servers/${server.id}/console`);
    setIsOpen(false);
    setQuery('');
  };

  const toggleSearch = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      {/* Search trigger button */}
      <button
        onClick={toggleSearch}
        className="group bg-gray-200/50 dark:bg-white/5 flex items-center h-[32px] px-2 w-full text-xs font-medium rounded-md transition-colors duration-200 ease-in-out border shadow-xs 
                 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 cursor-pointer dark:hover:bg-gray-700/50 border-transparent shadow-transparent"
      >
        <MagnifyingGlassIcon className="mr-2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 transition group-hover:text-gray-500 dark:group-hover:text-gray-400 stroke-[1.5]" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/50 rounded-sm">
         ⌘K
        </kbd>
      </button>

      {/* Search modal */}
      <div
        className={`absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-md border border-gray-200 dark:border-gray-700 z-50 
                   overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
      >
        <div className="relative">
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-3 py-2">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search servers..."
              className="w-full bg-transparent border-0 outline-none px-2 py-1 text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
            {query && (
              <button onClick={() => setQuery('')} className="p-1">
                <XMarkIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="px-3 py-2 text-center">
              <div className="animate-pulse text-[10px] text-gray-400 dark:text-gray-500">Loading servers...</div>
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              {filteredServers.length > 0 ? (
                <div className="py-1">
                  {filteredServers.map((server, index) => (
                    <div
                      key={server.id}
                      onClick={() => handleServerSelect(server)}
                      className={`px-3 py-2 cursor-pointer text-xs ${
                        selectedIndex === index 
                          ? 'bg-gray-100 dark:bg-gray-700/50' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`h-1.5 w-1.5 rounded-full mr-2 ${
                          server.status?.status?.state === 'running' 
                            ? 'bg-green-400 dark:bg-green-500' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}></div>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200">{server.name}</div>
                          {server.node && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">
                              {server.node.fqdn}:{server.node.port}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !loading && query ? (
                <div className="px-3 py-2 text-center">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">No servers found</div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ServerIcon as ServerOutline,
  Cog6ToothIcon as CogOutline,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { 
  ServerIcon as ServerSolid,
  Cog6ToothIcon as CogSolid,
} from '@heroicons/react/24/solid';
import { useAuth } from '../pages/[auth]/Auth';
import { ThemeToggle } from './ThemeToggle';
import SearchBar from './SearchBar';

const UserAvatar: React.FC<{ username: string }> = ({ username }) => {
  const initial = username.charAt(0).toUpperCase();
  
  return (
    <div className="h-6 w-6 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{initial}</span>
    </div>
  );
};

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isServerCategoryOpen, setIsServerCategoryOpen] = useState(true);
  const [isAdminCategoryOpen, setIsAdminCategoryOpen] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Auto-open admin category if on an admin page
    if (location.pathname.startsWith('/admin')) {
      setIsAdminCategoryOpen(true);
    }
    
    // Auto-open server category if on a server page
    if (isServerPage) {
      setIsServerCategoryOpen(true);
    }
  }, [location.pathname]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const toggleServerCategory = () => {
    setIsServerCategoryOpen(!isServerCategoryOpen);
  };

  const toggleAdminCategory = () => {
    setIsAdminCategoryOpen(!isAdminCategoryOpen);
  };

  const isServerPage = location.pathname.startsWith('/servers/') && location.pathname.split('/').length > 3;
  const isAdminPage = location.pathname.startsWith('/admin');

  // Admin navigation items
  const adminTabs = [
    { name: 'Overview', path: '/admin' },
    { name: 'Servers', path: '/admin/servers' },
    { name: 'Nodes', path: '/admin/nodes' },
    { name: 'Users', path: '/admin/users' },
    { name: 'Units', path: '/admin/units' }
  ];

  return (
    <>
      <div 
        className={`fixed inset-y-0 left-0 w-56 bg-gradient-to-b from-gray-100/50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800 
                   border-r border-gray-200 dark:border-gray-700 z-30 transform transition-transform duration-300 ease-in-out`}
      >
        {/* Logo section */}
        <div className="h-14 flex items-center justify-center px-4">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            <img src="https://i.imgur.com/wdKrkwO.png" alt="Argon Logo" className="h-7 grayscale dark:invert" />
          </span>
        </div>

        {/* Navigation */}
        <nav className="px-2 space-y-1">
          {/* Search Bar - NEW COMPONENT */}
          <div className="mb-1">
            <SearchBar />
          </div>

          <Link
            to="/servers"
            className={`group flex items-center h-[32px] px-2 text-xs font-medium rounded-md transition-colors duration-200 ease-in-out border shadow-xs ${
              location.pathname === '/servers'
                ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-transparent shadow-transparent'
            }`}
          >
            {location.pathname === '/servers' ? (
              <ServerSolid className="mr-2 h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ServerOutline className="mr-2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 transition group-hover:text-gray-500 dark:group-hover:text-gray-400 stroke-[1.5]" />
            )}
            Servers
          </Link>

          {/* Admin Category */}
          <div className="mt-0.5">
            <button
              onClick={toggleAdminCategory}
              className="group flex items-center h-[32px] px-2 text-[10px] uppercase tracking-widest font-medium rounded-md transition-colors duration-200 ease-in-out border shadow-xs 
                       text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-transparent shadow-transparent"
            >
              {isAdminCategoryOpen ? (
                <ChevronDownIcon className="mr-2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 transition group-hover:text-gray-500 dark:group-hover:text-gray-400" />
              ) : (
                <ChevronRightIcon className="mr-2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 transition group-hover:text-gray-500 dark:group-hover:text-gray-400" />
              )}
              Admin
            </button>
            <div className={`pl-4 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${isAdminCategoryOpen ? 'max-h-screen' : 'max-h-0 overflow-hidden'}`}>
              {adminTabs.map((tab) => {
                const isActive = location.pathname === tab.path;
                
                return (
                  <Link
                    key={tab.path}
                    to={tab.path}
                    className={`group flex items-center h-[32px] px-2 text-xs font-medium rounded-md transition-colors duration-200 ease-in-out border shadow-xs ${
                      isActive
                        ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-transparent shadow-transparent'
                    }`}
                  >
                    {tab.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {isServerPage && (
            <div>
              <div className="border-t mb-2 mt-4 border-gray-200 dark:border-gray-700" />
              <button
                onClick={toggleServerCategory}
                className="group flex items-center h-[32px] px-2 text-[10px] uppercase tracking-widest font-medium rounded-md transition-colors duration-200 ease-in-out border shadow-xs 
                         text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-transparent shadow-transparent"
              >
                {isServerCategoryOpen ? (
                  <ChevronDownIcon className="mr-2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 transition group-hover:text-gray-500 dark:group-hover:text-gray-400" />
                ) : (
                  <ChevronRightIcon className="mr-2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 transition group-hover:text-gray-500 dark:group-hover:text-gray-400" />
                )}
                Server
              </button>
              <div className={`pl-4 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${isServerCategoryOpen ? 'max-h-screen' : 'max-h-0 overflow-hidden'}`}>
                <Link
                  to={`${location.pathname.replace(/\/(console|files)$/, '')}/console`}
                  className={`group flex items-center h-[32px] px-2 text-xs font-medium rounded-md transition-colors duration-200 ease-in-out border shadow-xs ${
                    location.pathname.endsWith('/console')
                      ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-transparent shadow-transparent'
                  }`}
                >
                  Console
                </Link>
                <Link
                  to={`${location.pathname.replace(/\/(console|files)$/, '')}/files`}
                  className={`group flex items-center h-[32px] px-2 text-xs font-medium rounded-md transition-colors duration-200 ease-in-out border shadow-xs ${
                    location.pathname.endsWith('/files')
                      ? 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 border-transparent shadow-transparent'
                  }`}
                >
                  Files
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* User section with dropdown */}
        <div className="absolute bottom-0 w-full">
          <div 
            ref={buttonRef}
            className="relative px-3 py-3 flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
            onClick={toggleDropdown}
          >
            <UserAvatar username={user?.username || ''} />
            <div className="ml-2">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{user?.username}</p>
            </div>

            {/* Dropdown Menu */}
            <div 
              ref={dropdownRef}
              className={`absolute bottom-full left-2 right-2 mb-1 bg-white dark:bg-gray-800 rounded-md shadow-xs border border-gray-200 dark:border-gray-700 
                         overflow-hidden transform transition-all duration-200 ease-in-out origin-bottom ${
                isDropdownOpen 
                  ? 'opacity-100 scale-y-100 trangray-y-0' 
                  : 'opacity-0 scale-y-95 trangray-y-1 pointer-events-none'
              }`}
            >
              <div className="py-1">
                <ThemeToggle />
                <button className="w-full px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center">
                  <UserCircleIcon className="mr-2 h-3.5 w-3.5" />
                  Profile
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center"
                >
                  <ArrowLeftOnRectangleIcon className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
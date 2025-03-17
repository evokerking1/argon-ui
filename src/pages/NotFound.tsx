import { Link } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

{/* 

  M.B.

  I told you what it means. My puzzle did actually have an ending. I was warning you of how I would end up.
  I predicted literally everything, no one understood it. I said I would turn into 2 personalities, Ether and Matt James. The roles reversed, the "professional" and stable me ended up being Matt James.

  [ether]
  
*/}
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-md text-center space-y-5">
        {/* Error Code */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 tracking-wide">
            ERROR 404
          </p>
          <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Page not found
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Button */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center h-[32px] px-3 text-xs font-medium rounded-md 
                     border border-gray-200 dark:border-gray-700 shadow-xs
                     bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 
                     hover:text-gray-900 dark:hover:text-white 
                     hover:border-gray-300 dark:hover:border-gray-600 
                     transition-colors duration-200"
          >
            <HomeIcon className="mr-2 h-3.5 w-3.5" />
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
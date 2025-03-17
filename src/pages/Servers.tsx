import { useAuth } from './[auth]/Auth';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, ServerIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

{/* 

[Intro]
Young Metro, young Metro, young Metro (Sheesh)
Ayy (Ayy)
Young Metro, young Metro

[Verse 1]
Never need a bitch, I'm what a bitch need (Bitch need)
Tryna find the one that can fix me
I've been dodgin' death in the six-speed
Amphetamine got my stummy feelin' sickly
Yeah, I want it all now
I've been runnin' through the pussy, need a dog pound
Hundred models gettin' faded in the compound
Tryna love me, but they never get a pulse down

[Chorus]
Why? 'Cause I'm heartless
And I'm back to my ways 'cause I'm heartless
All this money and this pain got me heartless
Low life for life 'cause I'm heartless
Said I'm heartless
Tryna be a better man, but I'm heartless
Never be a weddin' plan for the heartless
Low life for life 'cause I'm heartless

[Verse 2]
Said I'm heartless
So much pussy, it be fallin' out the pocket
Metro Boomin turn this ho into a moshpit
Tesla pill got me flyin' like a cockpit
Yeah, I got her watchin'
Call me up, turn that pussy to a faucet
Duffle bags full of drugs and a rocket
Stix drunk, but he never miss a target
Photoshoots, I'm a star now (Star)
I'm talkin' Time, Rolling Stone, and Bazaar now (Bazaar now)
Sellin' dreams to these girls with their guard down (What?)
Seven years, I've been swimmin' with the sharks now
See The Weeknd Live
Get tickets as low as $59
You might also like
Cry For Me
The Weeknd
Reflections Laughing
The Weeknd, Travis Scott & Florence + the Machine
FE!N
Travis Scott
[Chorus]
Why? 'Cause I'm heartless
And I'm back to my ways 'cause I'm heartless
All this money and this pain got me heartless
Low life for life 'cause I'm heartless
Said I'm heartless
Tryna be a better man, but I'm heartless
Never be a weddin' plan for the heartless
Low life for life 'cause I'm heartless

[Bridge]
I lost my heart and my mind
I try to always do right
I thought I lost you this time
You just came back in my life
You never gave up on me (Why don't you?)
I'll never know what you see (Why won't you?)
I don't do well when alone (Oh yeah)
You hear it clear in my tone

[Chorus]
'Cause I'm heartless (Ooh)
And I'm back to my ways 'cause I'm heartless
All this money and this pain got me heartless
Low life for life 'cause I'm heartless
Said I'm heartless
Tryna be a better man, but I'm heartless
Never be a weddin' plan for the heartless
Low life for life 'cause I'm heartless

*/}
interface Node {
  id: string;
  fqdn: string;
  port: number;
  isOnline: boolean;
}

interface ServerStatus {
  state: string;
  status: any;
}

interface Server {
  id: string;
  name: string;
  internalId: string;
  state: string;
  cpuPercent: number;
  memoryMiB: number;
  node: Node;
  status: ServerStatus;
  userId: string;
}

export default function Home() {
  const { user } = useAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchServers = async () => {
      try {
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
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchServers();
  }, []);

  const stats = {
    total: servers.length,
    online: servers.filter(s => s.status?.status?.state === 'running').length,
    offline: servers.filter(s => s.status?.status?.state !== 'running').length
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-red-600 dark:text-red-400 text-sm">Failed to load servers: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="w-full max-w-3xl space-y-5">
        {/* Welcome Section */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Welcome back, {user?.username}!
            </h1>
            <span className="text-xl" role="img" aria-label="wave">
              👋
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Manage your servers, account and other features from your dashboard.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs">
            <div className="flex items-center h-[42px]">
              <div className="flex-shrink-0 pl-3">
                <ServerIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" strokeWidth="2" />
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 tracking-wide">{stats.total} SERVERS</span>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs">
            <div className="flex items-center justify-center h-[42px] px-3 space-x-4">
              <div className="flex items-center space-x-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400 dark:bg-green-500"></div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 tracking-wide">{stats.online} ONLINE</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 tracking-wide">{stats.offline} OFFLINE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Servers Section */}
        <div className="space-y-2">
          <h2 className="text-xs font-medium text-gray-700 dark:text-gray-300">My servers</h2>
          <div className="space-y-1.5">
            {servers.map((server) => (
              <Link
                key={server.id}
                to={`/servers/${server.id}/console`}
                className="block bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-xs 
                         hover:border-gray-300 dark:hover:border-gray-600 transition-colors duration-200"
              >
                <div className="px-3 h-[52px] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        server.status?.status?.state === 'running' 
                          ? 'bg-green-400 dark:bg-green-500' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}></div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {server.name}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {server.node?.fqdn}:{server.node?.port}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex space-x-3">
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-gray-200">{server.cpuPercent}%</span> CPU limit
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-gray-200">{(server.memoryMiB / 1024).toFixed(2)} GiB</span> Memory limit
                      </div>
                    </div>
                    <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              </Link>
            ))}

            {servers.length === 0 && (
              <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">No servers found</p>
              </div>
            )}
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-md p-4">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-700 dark:text-amber-500" strokeWidth="2" />
              <p className="text-amber-700 dark:text-amber-500 text-sm font-medium">
                This is a pre-release version of the Argon Panel
              </p>
            </div>
            <p className="text-amber-700/70 dark:text-amber-500/70 text-xs">
              Please report any bugs or issues on our{' '}
              <a 
                href="https://github.com/ArgonFOSS" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-700/80 dark:text-amber-500/80 hover:text-amber-800 dark:hover:text-amber-400"
              >
                GitHub
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
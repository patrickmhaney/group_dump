import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface SecurityContext {
  isCardAccessVerified: boolean;
  lastAccessTime: number | null;
  accessAttempts: number;
  maxAccessAttempts: number;
  sessionTimeoutMs: number;
  verifyCardAccess: (groupId: string) => Promise<boolean>;
  resetSecurity: () => void;
  isAccessBlocked: () => boolean;
}

const CardSecurityContext = createContext<SecurityContext | null>(null);

interface CardSecurityProviderProps {
  children: React.ReactNode;
}

export const CardSecurityProvider: React.FC<CardSecurityProviderProps> = ({ children }) => {
  const [isCardAccessVerified, setIsCardAccessVerified] = useState(false);
  const [lastAccessTime, setLastAccessTime] = useState<number | null>(null);
  const [accessAttempts, setAccessAttempts] = useState(0);
  
  // Security configuration
  const maxAccessAttempts = 3;
  const sessionTimeoutMs = 15 * 60 * 1000; // 15 minutes
  const attemptResetTimeMs = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    // Auto-logout after session timeout
    const checkSessionTimeout = () => {
      if (lastAccessTime && Date.now() - lastAccessTime > sessionTimeoutMs) {
        resetSecurity();
      }
    };

    const timeoutInterval = setInterval(checkSessionTimeout, 60000); // Check every minute
    
    return () => clearInterval(timeoutInterval);
  }, [lastAccessTime, sessionTimeoutMs]);

  useEffect(() => {
    // Reset access attempts after reset timeout
    if (accessAttempts >= maxAccessAttempts) {
      const resetTimer = setTimeout(() => {
        setAccessAttempts(0);
      }, attemptResetTimeMs);
      
      return () => clearTimeout(resetTimer);
    }
  }, [accessAttempts, maxAccessAttempts, attemptResetTimeMs]);

  const verifyCardAccess = async (groupId: string): Promise<boolean> => {
    if (isAccessBlocked()) {
      throw new Error(`Too many failed attempts. Please wait 30 minutes before trying again.`);
    }

    try {
      // Additional client-side validation
      const userAgent = navigator.userAgent;
      const timestamp = Date.now();
      
      // Check if this looks like a legitimate browser
      if (!userAgent || userAgent.length < 10) {
        throw new Error('Invalid browser configuration detected');
      }

      // Rate limiting check
      if (lastAccessTime && timestamp - lastAccessTime < 5000) { // 5 second minimum between attempts
        throw new Error('Please wait before attempting access again');
      }

      // Verify with backend
      const response = await axios.post(`/groups/${groupId}/verify-card-access`, {
        timestamp,
        client_info: {
          user_agent: userAgent,
          // eslint-disable-next-line no-restricted-globals
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });

      if (response.data.access_granted) {
        setIsCardAccessVerified(true);
        setLastAccessTime(timestamp);
        setAccessAttempts(0); // Reset attempts on success
        
        // Set automatic logout
        setTimeout(() => {
          resetSecurity();
        }, sessionTimeoutMs);
        
        return true;
      } else {
        throw new Error('Access denied');
      }
    } catch (error: any) {
      setAccessAttempts(prev => prev + 1);
      setIsCardAccessVerified(false);
      
      if (error.response?.status === 403) {
        throw new Error('Only group creators can access card details');
      } else if (error.response?.status === 404) {
        throw new Error('No virtual card found for this group');
      } else if (error.response?.status === 400) {
        throw new Error('Card is not active or access conditions not met');
      } else {
        throw new Error(error.message || 'Access verification failed');
      }
    }
  };

  const resetSecurity = () => {
    setIsCardAccessVerified(false);
    setLastAccessTime(null);
    // Don't reset access attempts here - they should only reset after timeout
  };

  const isAccessBlocked = (): boolean => {
    return accessAttempts >= maxAccessAttempts;
  };

  const contextValue: SecurityContext = {
    isCardAccessVerified,
    lastAccessTime,
    accessAttempts,
    maxAccessAttempts,
    sessionTimeoutMs,
    verifyCardAccess,
    resetSecurity,
    isAccessBlocked
  };

  return (
    <CardSecurityContext.Provider value={contextValue}>
      {children}
    </CardSecurityContext.Provider>
  );
};

export const useCardSecurity = (): SecurityContext => {
  const context = useContext(CardSecurityContext);
  if (!context) {
    throw new Error('useCardSecurity must be used within a CardSecurityProvider');
  }
  return context;
};

// Security monitoring hook
export const useSecurityMonitoring = (groupId: string) => {
  const [securityEvents, setSecurityEvents] = useState<string[]>([]);
  
  const logSecurityEvent = (event: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${event}`;
    
    setSecurityEvents(prev => [...prev.slice(-9), logEntry]); // Keep last 10 events
    
    // Send to backend for security logging
    axios.post(`/groups/${groupId}/security-log`, {
      event,
      timestamp,
      user_agent: navigator.userAgent,
      ip_address: 'client-side', // Will be filled by backend
    }).catch(error => {
      console.error('Failed to log security event:', error);
    });
  };

  return {
    securityEvents,
    logSecurityEvent
  };
};

export default CardSecurityProvider;
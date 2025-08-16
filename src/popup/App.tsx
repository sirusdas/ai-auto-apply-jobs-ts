import React, { useState } from 'react';
import TokenSettings from './components/TokenSettings';
import PersonalInfoSettings from './components/PersonalInfoSettings';
import ResumeManagement from './components/ResumeManagement';
import JobMatchSettings from './components/JobMatchSettings';
import CompanyPreferences from './components/CompanyPreferences';
import DelaySettings from './components/DelaySettings';
import AppliedJobs from './components/AppliedJobs';
import '../assets/styles/popup.css';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'applied-jobs' | 'personal-info' | 'resume' | 'match' | 'company' | 'delay'>('settings');
  const [isTokenValid, setIsTokenValid] = useState<boolean>(false);

  const handleTokenValidated = (valid: boolean) => {
    setIsTokenValid(valid);
  };

  return (
    <div className="app">
      <header>
        <h1>LinkedIn Auto Apply</h1>
      </header>
      
      <nav>
        <ul>
          <li>
            <button 
              className={activeTab === 'settings' ? 'active' : ''} 
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'applied-jobs' ? 'active' : ''} 
              onClick={() => setActiveTab('applied-jobs')}
            >
              Applied Jobs
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'personal-info' ? 'active' : ''} 
              onClick={() => setActiveTab('personal-info')}
            >
              Personal Info
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'resume' ? 'active' : ''} 
              onClick={() => setActiveTab('resume')}
            >
              Resume
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'match' ? 'active' : ''} 
              onClick={() => setActiveTab('match')}
            >
              Match Settings
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'company' ? 'active' : ''} 
              onClick={() => setActiveTab('company')}
            >
              Companies
            </button>
          </li>
          <li>
            <button 
              className={activeTab === 'delay' ? 'active' : ''} 
              onClick={() => setActiveTab('delay')}
            >
              Delays
            </button>
          </li>
        </ul>
      </nav>
      
      <main>
        {activeTab === 'settings' && (
          <TokenSettings />
        )}
        
        {activeTab === 'applied-jobs' && (
          <AppliedJobs />
        )}
        
        {activeTab === 'personal-info' && (
          <PersonalInfoSettings />
        )}
        
        {activeTab === 'resume' && (
          <ResumeManagement />
        )}
        
        {activeTab === 'match' && (
          <JobMatchSettings />
        )}
        
        {activeTab === 'company' && (
          <CompanyPreferences />
        )}
        
        {activeTab === 'delay' && (
          <DelaySettings />
        )}
      </main>
    </div>
  );
};

export default App;
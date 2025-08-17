import React, { useState, useEffect } from 'react';
import Accordion from './Accordion';

interface PersonalInfo {
  YearsOfExperience: string;
  FirstName: string;
  LastName: string;
  PhoneNumber: string;
  City: string;
  Email: string;
}

const PersonalInfoSettings: React.FC = () => {
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    YearsOfExperience: '',
    FirstName: '',
    LastName: '',
    PhoneNumber: '',
    City: '',
    Email: ''
  });
  
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load personal info from storage
    chrome.storage.local.get(['defaultFields'], (result) => {
      if (result.defaultFields) {
        setPersonalInfo(result.defaultFields);
      }
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    // Save to chrome storage
    chrome.storage.local.set({ defaultFields: personalInfo }, () => {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000); // Reset after 3 seconds
    });
  };

  return (
    <div className="personal-info-settings">
      <h2>Personal Information</h2>
      
      <Accordion title="Basic Information" defaultOpen={true}>
        <p>Fill in your basic information. This will be used as a fallback when using Free plan (AI disabled).</p>
        
        <div className="form-group">
          <label htmlFor="FirstName">First Name</label>
          <input
            type="text"
            id="FirstName"
            name="FirstName"
            value={personalInfo.FirstName}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="LastName">Last Name</label>
          <input
            type="text"
            id="LastName"
            name="LastName"
            value={personalInfo.LastName}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="Email">Email</label>
          <input
            type="email"
            id="Email"
            name="Email"
            value={personalInfo.Email}
            onChange={handleChange}
          />
        </div>
      </Accordion>
      
      <Accordion title="Contact Details">
        <div className="form-group">
          <label htmlFor="PhoneNumber">Phone Number</label>
          <input
            type="tel"
            id="PhoneNumber"
            name="PhoneNumber"
            value={personalInfo.PhoneNumber}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="City">City</label>
          <input
            type="text"
            id="City"
            name="City"
            value={personalInfo.City}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="YearsOfExperience">Years of Experience</label>
          <input
            type="text"
            id="YearsOfExperience"
            name="YearsOfExperience"
            value={personalInfo.YearsOfExperience}
            onChange={handleChange}
          />
        </div>
      </Accordion>
      
      <button 
        onClick={handleSave} 
        className="btn btn-primary"
      >
        Save Personal Info
      </button>
      
      {isSaved && (
        <div className="save-status">
          Personal info saved successfully!
        </div>
      )}
    </div>
  );
};

export default PersonalInfoSettings;
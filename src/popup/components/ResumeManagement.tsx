import React, { useState, useEffect } from 'react';

const ResumeManagement: React.FC = () => {
  const [resumeText, setResumeText] = useState('');
  const [compressedResume, setCompressedResume] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    // Load saved resume data
    chrome.storage.local.get(['plainTextResume', 'compressedResumeYAML'], (result) => {
      if (result.plainTextResume) {
        setResumeText(result.plainTextResume);
      }
      if (result.compressedResumeYAML) {
        setCompressedResume(result.compressedResumeYAML);
        setStatus({ type: 'success', message: 'Compressed resume found in storage' });
      } else {
        setStatus({ type: 'info', message: 'No compressed resume found. Please generate or paste one.' });
      }
    });
  }, []);

  const handleGenerateResume = async () => {
    if (!resumeText.trim()) {
      setStatus({ type: 'error', message: 'Please paste your resume text first.' });
      return;
    }

    setStatus({ type: 'info', message: 'Generating compressed resume... Please wait.' });

    try {
      // Get API token
      const tokenResult = await new Promise<{ apiToken?: string }>((resolve) => {
        chrome.storage.local.get(['apiToken'], resolve);
      });

      if (!tokenResult.apiToken) {
        setStatus({ type: 'error', message: 'API token not found. Please save your token first.' });
        return;
      }

      // Decrypt token
      const apiToken = atob(tokenResult.apiToken);

      // Get plan type
      const planResult = await new Promise<{ planType?: string }>((resolve) => {
        chrome.storage.local.get(['planType'], resolve);
      });

      const planType = planResult.planType || 'Free';

      // Generate prompt for resume compression
      const prompt = `Create a compressed YAML profile for a professional, optimized for minimal space while retaining essential information. Adhere to the following structure and guidelines:

personal:{name:string,surname:string,dateOfBirth:string,country:string,city:string,address:string,phone:string,email:string,github:string,linkedin:string}
self:{gender:string,pronouns:string,veteran:boolean,disability:boolean,ethnicity:string}
legal:{euWorkAuth:boolean,usWorkAuth:boolean,reqUsVisa:boolean,canWorkUs:boolean,reqUsSponsor:boolean,reqEuVisa:boolean,canWorkEu:boolean,reqEuSponsor:boolean}
workPrefs:{remote:boolean,inPerson:boolean,relocate:boolean,assessments:boolean,drugTests:boolean,bgChecks:boolean}
edu:[{degree:string,university:string,gpa:number,gradYear:number,field:string,skillsAcq:{key:string,value:number}}]
exp:[{position:string,company:string,period:string,location:string,industry:string,resp:{key:string,value:string},skillsAcq:{key:string,value:number}}]
projects:{project1:string,project2:string}
availability:{noticePeriod:string}
salary:{usd:string}
certs:[string]
skills:{key:string,value:number}
lang:[{language:string,proficiency:string}]
interests:[string]
Notice-Period:string
Current-Location:string
CountryCode:string
BachelorsDegree:boolean
note:string

Instructions:
Follow the exact compressed YAML structure above, using single-line key-value pairs and arrays where possible to minimize space.
Abbreviate field names (e.g., euWorkAuth instead of euWorkAuthorization, skillsAcq instead of skillsAcquired).
Combine related fields (e.g., phonePrefix and phone into a single phone field with format +XX XXXXXXXXXX).
Use camelCase or abbreviated keys for skills (e.g., softwareArch, problem, cloudOpt) and responsibilities (e.g., responsibility1).
Represent dates in YYYY-MM-DD format for dateOfBirth and numeric gradYear.
Limit responsibilities to 3-5 per job, using concise descriptions.
Include only essential skills and certifications, with proficiency levels as integers (1-10, interpreted as years of experience in the note).
For projects, provide a brief description with an optional [Private Repo] link.
Use a single salary.usd field with a simplified value (e.g., 60000 instead of a range).
Include additional fields (Notice-Period, Current-Location, CountryCode, BachelorsDegree, note) at the root level.
In the note, specify: "All numbers in skills represent years of experience. AI NOTE- If the primary programming language does not match reject it."
Use realistic placeholder data for a tech professional, ensuring consistency with the original structure.
Avoid unnecessary whitespace, quotes, or line breaks to keep the YAML as compact as possible.

Resume Text:
${resumeText}`;

      let compressedYaml = '';

      if (planType.toLowerCase() === 'pro') {
        // Use custom AI API for Pro users
        const response = await fetch('https://qerds.com/tools/tgs/api/ai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiToken
          },
          body: JSON.stringify({ query: prompt })
        });

        if (!response.ok) {
          throw new Error(`Custom AI API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        compressedYaml = data?.data?.text || '';

        // Clean up the response
        compressedYaml = compressedYaml.replace(/^```yaml\n/, '').replace(/\n```$/, '');
      } else {
        // Use AI Service via Background script
        const response: any = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'generateResume',
            prompt: prompt
          }, (res) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else if (res && res.success) resolve(res.data);
            else reject(new Error(res?.error || 'Failed to generate resume'));
          });
        });

        compressedYaml = response.content || '';

        // Clean up the response
        compressedYaml = compressedYaml.replace(/^```yaml\n/, '').replace(/\n```$/, '');
      }

      if (!compressedYaml) {
        throw new Error('Could not generate compressed YAML resume');
      }

      // Save to storage
      chrome.storage.local.set({
        plainTextResume: resumeText,
        compressedResumeYAML: compressedYaml
      }, () => {
        setCompressedResume(compressedYaml);
        setStatus({ type: 'success', message: 'Successfully generated and saved compressed resume!' });
      });
    } catch (error: any) {
      console.error('Error generating resume:', error);
      setStatus({ type: 'error', message: `Error generating resume: ${error.message}` });
    }
  };

  const handleSaveManualResume = () => {
    if (!compressedResume.trim()) {
      setStatus({ type: 'error', message: 'Please paste the compressed YAML resume first.' });
      return;
    }

    if (!compressedResume.includes('personal:') || !compressedResume.includes('skills:')) {
      setStatus({ type: 'error', message: 'The provided text does not look like the expected YAML format.' });
      return;
    }

    chrome.storage.local.set({ compressedResumeYAML: compressedResume }, () => {
      setStatus({ type: 'success', message: 'Successfully saved manual compressed resume!' });
    });
  };

  const handleEditResume = () => {
    chrome.storage.local.get(['compressedResumeYAML'], (result) => {
      if (result.compressedResumeYAML) {
        setCompressedResume(result.compressedResumeYAML);
      } else {
        setStatus({ type: 'error', message: 'No compressed resume found in storage to edit.' });
      }
    });
  };

  return (
    <div className="resume-management">
      <h2>Resume Management</h2>

      <div className="form-group">
        <label htmlFor="resume-text">Full Resume Text:</label>
        <textarea
          id="resume-text"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your full resume here..."
          rows={10}
        />
      </div>

      <button
        className="btn btn-primary"
        onClick={handleGenerateResume}
      >
        Generate Compressed Resume
      </button>

      <div className="form-group" style={{ marginTop: '20px' }}>
        <label htmlFor="compressed-resume">Compressed YAML Resume:</label>
        <textarea
          id="compressed-resume"
          value={compressedResume}
          onChange={(e) => setCompressedResume(e.target.value)}
          placeholder="Generated compressed resume will appear here..."
          rows={10}
        />
      </div>

      <div className="button-group">
        <button
          className="btn btn-secondary"
          onClick={handleEditResume}
        >
          Edit Resume
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSaveManualResume}
        >
          Save Manual Resume
        </button>
      </div>

      {status && (
        <div className={`status-message ${status.type}`}>
          {status.message}
        </div>
      )}
    </div>
  );
};

export default ResumeManagement;
import React, { useState, useEffect, useRef } from 'react';
import Accordion from '../../popup/components/Accordion';

const FormControlConfigurations: React.FC = () => {
  const [textFields, setTextFields] = useState<Array<{id: string, label: string, value: string}>>([]);
  const [radioButtons, setRadioButtons] = useState<Array<{id: string, label: string, options: string[], selected: string}>>([]);
  const [dropdowns, setDropdowns] = useState<Array<{id: string, label: string, options: string[], selected: string}>>([]);
  const [isJsonEditing, setIsJsonEditing] = useState(false);
  const jsonEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved form control configurations
    chrome.storage.local.get(['textFields', 'radioButtons', 'dropdowns'], (result) => {
      if (result.textFields) {
        setTextFields(result.textFields);
      }
      if (result.radioButtons) {
        setRadioButtons(result.radioButtons);
      }
      if (result.dropdowns) {
        setDropdowns(result.dropdowns);
      }
    });
  }, []);

  useEffect(() => {
    // Initialize JSON editor when form controls change
    if (jsonEditorRef.current) {
      try {
        // Create a simple textarea-based JSON editor
        jsonEditorRef.current.innerHTML = '';
        const textarea = document.createElement('textarea');
        textarea.value = JSON.stringify({ textFields, radioButtons, dropdowns }, null, 2);
        textarea.style.width = '100%';
        textarea.style.height = '300px';
        textarea.style.fontFamily = 'monospace';
        textarea.style.fontSize = '14px';
        textarea.style.padding = '10px';
        textarea.style.border = '1px solid #ddd';
        textarea.style.borderRadius = '4px';
        textarea.style.backgroundColor = '#f8f9fa';
        textarea.readOnly = !isJsonEditing; // Make editable when in editing mode
        jsonEditorRef.current.appendChild(textarea);
        
        // Add button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '10px';
        
        if (!isJsonEditing) {
          const editButton = document.createElement('button');
          editButton.textContent = 'Edit JSON';
          editButton.className = 'btn btn-secondary';
          editButton.type = 'button';
          editButton.onclick = () => setIsJsonEditing(true);
          buttonContainer.appendChild(editButton);
        } else {
          const saveButton = document.createElement('button');
          saveButton.textContent = 'Save JSON';
          saveButton.className = 'btn btn-primary';
          saveButton.type = 'button';
          saveButton.style.marginRight = '10px';
          saveButton.onclick = handleJsonSave;
          buttonContainer.appendChild(saveButton);
          
          const cancelButton = document.createElement('button');
          cancelButton.textContent = 'Cancel';
          cancelButton.className = 'btn btn-danger';
          cancelButton.type = 'button';
          cancelButton.onclick = () => setIsJsonEditing(false);
          buttonContainer.appendChild(cancelButton);
        }
        
        jsonEditorRef.current.appendChild(buttonContainer);
      } catch (e) {
        console.error('Error initializing JSON editor:', e);
      }
    }
  }, [textFields, radioButtons, dropdowns, isJsonEditing]);

  const handleJsonSave = () => {
    if (jsonEditorRef.current) {
      const textarea = jsonEditorRef.current.querySelector('textarea');
      if (textarea) {
        try {
          const newData = JSON.parse(textarea.value);
          setTextFields(newData.textFields || []);
          setRadioButtons(newData.radioButtons || []);
          setDropdowns(newData.dropdowns || []);
          setIsJsonEditing(false);
          
          // Show success message
          const toast = document.getElementById('toast-message');
          if (toast) {
            toast.textContent = 'JSON updated successfully! Please save to apply changes.';
            toast.style.display = 'block';
            setTimeout(() => {
              toast.style.display = 'none';
            }, 3000);
          }
        } catch (e) {
          // Show error message
          const toast = document.getElementById('toast-message');
          if (toast) {
            toast.textContent = 'Invalid JSON format. Please check your input.';
            toast.style.display = 'block';
            toast.style.backgroundColor = '#dc3545';
            setTimeout(() => {
              toast.style.display = 'none';
              toast.style.backgroundColor = '';
            }, 5000);
          }
          console.error('Error parsing JSON:', e);
        }
      }
    }
  };

  const handleSave = () => {
    chrome.storage.local.set({ 
      textFields, 
      radioButtons, 
      dropdowns 
    }, () => {
      // Show success message
      const toast = document.getElementById('toast-message');
      if (toast) {
        toast.textContent = 'Form control configurations saved successfully!';
        toast.style.display = 'block';
        setTimeout(() => {
          toast.style.display = 'none';
        }, 3000);
      }
    });
  };

  const addTextField = () => {
    setTextFields([
      ...textFields,
      { id: `text-${Date.now()}`, label: '', value: '' }
    ]);
  };

  const addRadioButton = () => {
    setRadioButtons([
      ...radioButtons,
      { id: `radio-${Date.now()}`, label: '', options: ['Option 1', 'Option 2'], selected: 'Option 1' }
    ]);
  };

  const addDropdown = () => {
    setDropdowns([
      ...dropdowns,
      { id: `dropdown-${Date.now()}`, label: '', options: ['Option 1', 'Option 2'], selected: 'Option 1' }
    ]);
  };

  const updateTextField = (index: number, field: string, value: string) => {
    const updatedFields = [...textFields];
    (updatedFields[index] as any)[field] = value;
    setTextFields(updatedFields);
  };

  const updateRadioButton = (index: number, field: string, value: string | string[]) => {
    const updatedButtons = [...radioButtons];
    if (Array.isArray(value)) {
      (updatedButtons[index] as any).options = value;
    } else {
      (updatedButtons[index] as any)[field] = value;
    }
    setRadioButtons(updatedButtons);
  };

  const updateDropdown = (index: number, field: string, value: string | string[]) => {
    const updatedDropdowns = [...dropdowns];
    if (Array.isArray(value)) {
      (updatedDropdowns[index] as any).options = value;
    } else {
      (updatedDropdowns[index] as any)[field] = value;
    }
    setDropdowns(updatedDropdowns);
  };

  const removeTextField = (index: number) => {
    const updatedFields = [...textFields];
    updatedFields.splice(index, 1);
    setTextFields(updatedFields);
  };

  const removeRadioButton = (index: number) => {
    const updatedButtons = [...radioButtons];
    updatedButtons.splice(index, 1);
    setRadioButtons(updatedButtons);
  };

  const removeDropdown = (index: number) => {
    const updatedDropdowns = [...dropdowns];
    updatedDropdowns.splice(index, 1);
    setDropdowns(updatedDropdowns);
  };

  const addRadioButtonOption = (radioIndex: number) => {
    const updatedButtons = [...radioButtons];
    updatedButtons[radioIndex].options.push('');
    setRadioButtons(updatedButtons);
  };

  const removeRadioButtonOption = (radioIndex: number, optionIndex: number) => {
    const updatedButtons = [...radioButtons];
    if (updatedButtons[radioIndex].options.length > 1) {
      updatedButtons[radioIndex].options.splice(optionIndex, 1);
      setRadioButtons(updatedButtons);
    }
  };

  const updateRadioButtonOption = (radioIndex: number, optionIndex: number, value: string) => {
    const updatedButtons = [...radioButtons];
    updatedButtons[radioIndex].options[optionIndex] = value;
    setRadioButtons(updatedButtons);
  };

  const addDropdownOption = (dropdownIndex: number) => {
    const updatedDropdowns = [...dropdowns];
    updatedDropdowns[dropdownIndex].options.push('');
    setDropdowns(updatedDropdowns);
  };

  const removeDropdownOption = (dropdownIndex: number, optionIndex: number) => {
    const updatedDropdowns = [...dropdowns];
    if (updatedDropdowns[dropdownIndex].options.length > 1) {
      updatedDropdowns[dropdownIndex].options.splice(optionIndex, 1);
      setDropdowns(updatedDropdowns);
    }
  };

  const updateDropdownOption = (dropdownIndex: number, optionIndex: number, value: string) => {
    const updatedDropdowns = [...dropdowns];
    updatedDropdowns[dropdownIndex].options[optionIndex] = value;
    setDropdowns(updatedDropdowns);
  };

  return (
    <div className="form-control-configurations">
      <h2>Form Control Configurations</h2>
      
      <div className="form-controls-container">
        <Accordion title="Text Fields Configuration" defaultOpen={true}>
          <div className="control-section">
            {textFields.map((field, index) => (
              <div key={field.id} className="control-item">
                <div className="form-group">
                  <label>Label</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Field label"
                    value={field.label}
                    onChange={(e) => updateTextField(index, 'label', e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label>Default Value</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Default value"
                    value={field.value}
                    onChange={(e) => updateTextField(index, 'value', e.target.value)}
                  />
                </div>
                
                <div className="control-actions">
                  <button 
                    className="btn btn-danger" 
                    onClick={() => removeTextField(index)}
                  >
                    Remove Text Field
                  </button>
                </div>
              </div>
            ))}
            
            <div className="section-actions">
              <button className="btn btn-primary" onClick={addTextField}>
                Add Text Field
              </button>
            </div>
          </div>
        </Accordion>
        
        <Accordion title="Radio Buttons Configuration">
          <div className="control-section">
            {radioButtons.map((radio, index) => (
              <div key={radio.id} className="control-item">
                <div className="form-group">
                  <label>Label</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Radio group label"
                    value={radio.label}
                    onChange={(e) => updateRadioButton(index, 'label', e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label>Options</label>
                  <div className="options-container">
                    {radio.options.map((option, optIndex) => (
                      <div key={optIndex} className="option-item">
                        <input
                          type="text"
                          className="form-control option-input"
                          placeholder={`Option ${optIndex + 1}`}
                          value={option}
                          onChange={(e) => updateRadioButtonOption(index, optIndex, e.target.value)}
                        />
                        <button 
                          className="btn btn-danger btn-small"
                          onClick={() => removeRadioButtonOption(index, optIndex)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button 
                      className="btn btn-secondary"
                      onClick={() => addRadioButtonOption(index)}
                    >
                      Add Option
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Selected Option</label>
                  <select
                    className="form-control"
                    value={radio.selected}
                    onChange={(e) => updateRadioButton(index, 'selected', e.target.value)}
                  >
                    {radio.options.map((option, optIndex) => (
                      <option key={optIndex} value={option}>
                        {option || 'Unnamed Option'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="control-actions">
                  <button 
                    className="btn btn-danger" 
                    onClick={() => removeRadioButton(index)}
                  >
                    Remove Radio Button Group
                  </button>
                </div>
              </div>
            ))}
            
            <div className="section-actions">
              <button className="btn btn-primary" onClick={addRadioButton}>
                Add Radio Button Group
              </button>
            </div>
          </div>
        </Accordion>
        
        <Accordion title="Dropdowns Configuration">
          <div className="control-section">
            {dropdowns.map((dropdown, index) => (
              <div key={dropdown.id} className="control-item">
                <div className="form-group">
                  <label>Label</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Dropdown label"
                    value={dropdown.label}
                    onChange={(e) => updateDropdown(index, 'label', e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label>Options</label>
                  <div className="options-container">
                    {dropdown.options.map((option, optIndex) => (
                      <div key={optIndex} className="option-item">
                        <input
                          type="text"
                          className="form-control option-input"
                          placeholder={`Option ${optIndex + 1}`}
                          value={option}
                          onChange={(e) => updateDropdownOption(index, optIndex, e.target.value)}
                        />
                        <button 
                          className="btn btn-danger btn-small"
                          onClick={() => removeDropdownOption(index, optIndex)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button 
                      className="btn btn-secondary"
                      onClick={() => addDropdownOption(index)}
                    >
                      Add Option
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Selected Option</label>
                  <select
                    className="form-control"
                    value={dropdown.selected}
                    onChange={(e) => updateDropdown(index, 'selected', e.target.value)}
                  >
                    {dropdown.options.map((option, optIndex) => (
                      <option key={optIndex} value={option}>
                        {option || 'Unnamed Option'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="control-actions">
                  <button 
                    className="btn btn-danger" 
                    onClick={() => removeDropdown(index)}
                  >
                    Remove Dropdown
                  </button>
                </div>
              </div>
            ))}
            
            <div className="section-actions">
              <button className="btn btn-primary" onClick={addDropdown}>
                Add Dropdown
              </button>
            </div>
          </div>
        </Accordion>
        
        <Accordion title="Form Controls JSON Editor">
          <div className="control-section">
            <p>Edit the form controls configuration directly in JSON format.</p>
            <div ref={jsonEditorRef} id="formControlsJsonEditor"></div>
          </div>
        </Accordion>
      </div>
      
      <div className="form-actions">
        <button className="btn btn-primary btn-large" onClick={handleSave}>
          Save Form Control Configurations
        </button>
      </div>
      
      <div id="toast-message" className="toast-message">
      </div>
    </div>
  );
};

export default FormControlConfigurations;
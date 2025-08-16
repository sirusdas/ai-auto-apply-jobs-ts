import React, { useState, useEffect } from 'react';

const FormControlConfigurations: React.FC = () => {
  const [textFields, setTextFields] = useState<Array<{id: string, label: string, value: string}>>([]);
  const [radioButtons, setRadioButtons] = useState<Array<{id: string, label: string, options: string[], selected: string}>>([]);
  const [dropdowns, setDropdowns] = useState<Array<{id: string, label: string, options: string[], selected: string}>>([]);

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
      { id: `radio-${Date.now()}`, label: '', options: ['', ''], selected: '' }
    ]);
  };

  const addDropdown = () => {
    setDropdowns([
      ...dropdowns,
      { id: `dropdown-${Date.now()}`, label: '', options: ['', ''], selected: '' }
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

  return (
    <div className="form-control-configurations">
      <h2>Form Control Configurations</h2>
      
      <div className="accordion">
        <h3>Text Fields Entry</h3>
        <div className="panel">
          {textFields.map((field, index) => (
            <div key={field.id} className="form-group">
              <input
                type="text"
                placeholder="Label"
                value={field.label}
                onChange={(e) => updateTextField(index, 'label', e.target.value)}
              />
              <input
                type="text"
                placeholder="Value"
                value={field.value}
                onChange={(e) => updateTextField(index, 'value', e.target.value)}
              />
              <button 
                className="btn btn-danger" 
                onClick={() => removeTextField(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button className="btn btn-primary" onClick={addTextField}>
            Add Text Field
          </button>
        </div>
      </div>
      
      <div className="accordion">
        <h3>Radio Buttons Entry</h3>
        <div className="panel">
          {radioButtons.map((radio, index) => (
            <div key={radio.id} className="form-group">
              <input
                type="text"
                placeholder="Label"
                value={radio.label}
                onChange={(e) => updateRadioButton(index, 'label', e.target.value)}
              />
              <div className="options">
                {radio.options.map((option, optIndex) => (
                  <input
                    key={optIndex}
                    type="text"
                    placeholder={`Option ${optIndex + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...radio.options];
                      newOptions[optIndex] = e.target.value;
                      updateRadioButton(index, 'options', newOptions);
                    }}
                  />
                ))}
                <button 
                  className="btn" 
                  onClick={() => {
                    const newOptions = [...radio.options, ''];
                    updateRadioButton(index, 'options', newOptions);
                  }}
                >
                  Add Option
                </button>
              </div>
              <button 
                className="btn btn-danger" 
                onClick={() => removeRadioButton(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button className="btn btn-primary" onClick={addRadioButton}>
            Add Radio Button
          </button>
        </div>
      </div>
      
      <div className="accordion">
        <h3>Dropdowns Entry</h3>
        <div className="panel">
          {dropdowns.map((dropdown, index) => (
            <div key={dropdown.id} className="form-group">
              <input
                type="text"
                placeholder="Label"
                value={dropdown.label}
                onChange={(e) => updateDropdown(index, 'label', e.target.value)}
              />
              <div className="options">
                {dropdown.options.map((option, optIndex) => (
                  <input
                    key={optIndex}
                    type="text"
                    placeholder={`Option ${optIndex + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...dropdown.options];
                      newOptions[optIndex] = e.target.value;
                      updateDropdown(index, 'options', newOptions);
                    }}
                  />
                ))}
                <button 
                  className="btn" 
                  onClick={() => {
                    const newOptions = [...dropdown.options, ''];
                    updateDropdown(index, 'options', newOptions);
                  }}
                >
                  Add Option
                </button>
              </div>
              <button 
                className="btn btn-danger" 
                onClick={() => removeDropdown(index)}
              >
                Remove
              </button>
            </div>
          ))}
          <button className="btn btn-primary" onClick={addDropdown}>
            Add Dropdown
          </button>
        </div>
      </div>
      
      <button className="btn btn-primary" onClick={handleSave}>
        Save Form Control Configurations
      </button>
    </div>
  );
};

export default FormControlConfigurations;
'use client';

import { useState } from 'react';

interface ClassInfo {
  name: string;
  professor: string;
  days: string[];
  startTime: string;
  endTime: string;
  location: string;
  startDate: string;
  endDate: string;
}

interface SchedulePreviewProps {
  classes: ClassInfo[];
  onConfirm: (format: string, updatedClasses: ClassInfo[]) => void;
  onCancel: () => void;
}

export default function SchedulePreview({ classes: initialClasses, onConfirm, onCancel }: SchedulePreviewProps) {
  const [selectedFormat, setSelectedFormat] = useState('ics');
  const [classes, setClasses] = useState<ClassInfo[]>(initialClasses);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);

  const formatOptions = [
    { id: 'ics', name: 'Apple Calendar (.ics)', icon: '📱' },
    { id: 'google', name: 'Google Calendar', icon: '📅' },
    { id: 'outlook', name: 'Outlook Calendar', icon: '📆' },
  ];

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setEditingClass({...classes[index]});
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingClass) {
      const updatedClasses = [...classes];
      updatedClasses[editingIndex] = editingClass;
      setClasses(updatedClasses);
      setEditingIndex(null);
      setEditingClass(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingClass(null);
  };

  const handleDayToggle = (day: string) => {
    if (!editingClass) return;
    
    const updatedDays = editingClass.days.includes(day)
      ? editingClass.days.filter(d => d !== day)
      : [...editingClass.days, day];
    
    setEditingClass({
      ...editingClass,
      days: updatedDays
    });
  };

  const handleInputChange = (field: keyof ClassInfo, value: string) => {
    if (!editingClass) return;

    setEditingClass({
      ...editingClass,
      [field]: value
    });
  };

  return (
    <div className="bg-card rounded-lg shadow-card p-6 w-full max-w-3xl">
      <h2 className="text-2xl font-bold mb-4">Verify Your Schedule</h2>
      <p className="text-sm mb-6">Please verify the extracted class information before generating your calendar.</p>
      
      <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
        {classes.map((classInfo, index) => (
          <div key={index} className="border border-border rounded-md p-4 bg-accent bg-opacity-50">
            {editingIndex === index ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Class Name</label>
                  <input
                    type="text"
                    value={editingClass?.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full p-2 border border-border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Professor</label>
                  <input
                    type="text"
                    value={editingClass?.professor || ''}
                    onChange={(e) => handleInputChange('professor', e.target.value)}
                    className="w-full p-2 border border-border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Days</label>
                  <div className="flex flex-wrap gap-2">
                    {weekdays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayToggle(day)}
                        className={`px-2 py-1 text-xs rounded-md ${
                          editingClass?.days.includes(day)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent text-foreground'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input
                      type="time"
                      value={editingClass?.startTime || ''}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      className="w-full p-2 border border-border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input
                      type="time"
                      value={editingClass?.endTime || ''}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                      className="w-full p-2 border border-border rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={editingClass?.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full p-2 border border-border rounded-md"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editingClass?.startDate || ''}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full p-2 border border-border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      value={editingClass?.endDate || ''}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full p-2 border border-border rounded-md"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 border border-border rounded-md hover:bg-accent transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-opacity-90 transition-colors text-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{classInfo.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      Professor: {classInfo.professor}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEditClick(index)}
                    className="text-primary hover:text-primary-dark text-sm"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div>
                    <p className="text-sm font-medium">Days:</p>
                    <p className="text-sm">{classInfo.days.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Time:</p>
                    <p className="text-sm">{classInfo.startTime} - {classInfo.endTime}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Location:</p>
                    <p className="text-sm">{classInfo.location}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Date Range:</p>
                    <p className="text-sm">{classInfo.startDate} to {classInfo.endDate}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3 mb-6">
        <h3 className="font-medium">Select Calendar Format:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {formatOptions.map((format) => (
            <button
              key={format.id}
              className={`p-3 border rounded-md flex items-center gap-2 transition-colors ${
                selectedFormat === format.id
                  ? 'border-primary bg-primary bg-opacity-10'
                  : 'border-border hover:bg-accent'
              }`}
              onClick={() => setSelectedFormat(format.id)}
            >
              <span className="text-xl">{format.icon}</span>
              <span>{format.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(selectedFormat, classes)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-opacity-90 transition-colors"
        >
          Generate Calendar
        </button>
      </div>
    </div>
  );
} 
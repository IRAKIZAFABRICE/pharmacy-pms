// packages/frontend/src/pages/Calculator.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';

const MEDICATIONS = ['AMOXICLAV', 'AMOXICILLIN', 'BACTRIM', 'ARTEMETHER', 'PARACETAMOL', 'IBUPROFEN'];
const RECORD_TYPES = ['BMI', 'BLOOD_PRESSURE', 'CHOLESTEROL', 'GLUCOSE', 'TEMPERATURE', 'HUMIDITY'];

export default function Calculator() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dose');

  // Dose form
  const [doseForm, setDoseForm] = useState({
    patientName: '', patientAge: '', patientWeight: '', medication: 'AMOXICLAV',
    frequency: '', duration: '', notes: ''
  });
  const [doseResult, setDoseResult] = useState<any>(null);

  // BMI form
  const [bmiForm, setBmiForm] = useState({ patientName: '', patientHeight: '', patientWeight: '' });
  const [bmiResult, setBmiResult] = useState<any>(null);

  // Patient record form
  const [recordForm, setRecordForm] = useState({
    patientName: '', patientAge: '', patientWeight: '', patientHeight: '',
    recordType: 'BLOOD_PRESSURE', value: '', unit: '', notes: ''
  });

  // Device record form
  const [deviceForm, setDeviceForm] = useState({
    deviceName: '', deviceType: 'THERMOMETER', temperature: '', humidity: '', location: '', notes: ''
  });

  // Fetch dose history
  const { data: doseHistory } = useQuery({
    queryKey: ['dose-history'],
    queryFn: async () => {
      const response = await api.get('/calculator/dose/history');
      return response.data;
    },
  });

  // Fetch patient records
  const { data: patientRecords } = useQuery({
    queryKey: ['patient-records'],
    queryFn: async () => {
      const response = await api.get('/calculator/patient-records');
      return response.data;
    },
  });

  // Fetch device records
  const { data: deviceRecords } = useQuery({
    queryKey: ['device-records'],
    queryFn: async () => {
      const response = await api.get('/calculator/device-records');
      return response.data;
    },
  });

  // Mutations
  const calculateDose = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/calculator/dose', data);
      return response;
    },
    onSuccess: (data) => {
      setDoseResult(data);
      toast.success('✅ Dose calculated');
      queryClient.invalidateQueries({ queryKey: ['dose-history'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Calculation failed'),
  });

  const calculateBMI = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/calculator/bmi', data);
      return response;
    },
    onSuccess: (data) => {
      setBmiResult(data);
      toast.success('✅ BMI calculated');
      queryClient.invalidateQueries({ queryKey: ['patient-records'] });
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'BMI calculation failed'),
  });

  const createRecord = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/calculator/patient-records', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Record saved');
      queryClient.invalidateQueries({ queryKey: ['patient-records'] });
      setRecordForm({ patientName: '', patientAge: '', patientWeight: '', patientHeight: '', recordType: 'BLOOD_PRESSURE', value: '', unit: '', notes: '' });
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Failed to save record'),
  });

  const createDeviceRecord = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/calculator/device-records', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Device reading saved');
      queryClient.invalidateQueries({ queryKey: ['device-records'] });
      setDeviceForm({ deviceName: '', deviceType: 'THERMOMETER', temperature: '', humidity: '', location: '', notes: '' });
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Failed to save reading'),
  });

  const handleDose = (e: React.FormEvent) => {
    e.preventDefault();
    calculateDose.mutate(doseForm);
  };

  const handleBMI = (e: React.FormEvent) => {
    e.preventDefault();
    calculateBMI.mutate(bmiForm);
  };

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    createRecord.mutate(recordForm);
  };

  const handleDevice = (e: React.FormEvent) => {
    e.preventDefault();
    createDeviceRecord.mutate(deviceForm);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">🧮 Calculator & Monitoring</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1 flex-wrap">
        <button onClick={() => setActiveTab('dose')} className={`px-4 py-2 rounded-lg ${activeTab === 'dose' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>💊 Dose Calc</button>
        <button onClick={() => setActiveTab('bmi')} className={`px-4 py-2 rounded-lg ${activeTab === 'bmi' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>⚖️ BMI</button>
        <button onClick={() => setActiveTab('monitor')} className={`px-4 py-2 rounded-lg ${activeTab === 'monitor' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>📊 Monitoring</button>
        <button onClick={() => setActiveTab('device')} className={`px-4 py-2 rounded-lg ${activeTab === 'device' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>🌡️ Device Records</button>
      </div>

      {/* Dose Calculation */}
      {activeTab === 'dose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Standard Dose Calculation</h2>
            <form onSubmit={handleDose} className="space-y-4">
              <input type="text" placeholder="Patient Name" className="w-full px-3 py-2 border rounded-lg" value={doseForm.patientName} onChange={(e) => setDoseForm({ ...doseForm, patientName: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Age (years)" className="w-full px-3 py-2 border rounded-lg" value={doseForm.patientAge} onChange={(e) => setDoseForm({ ...doseForm, patientAge: e.target.value })} />
                <input type="number" placeholder="Weight (kg) *" required className="w-full px-3 py-2 border rounded-lg" value={doseForm.patientWeight} onChange={(e) => setDoseForm({ ...doseForm, patientWeight: e.target.value })} />
              </div>
              <select className="w-full px-3 py-2 border rounded-lg" value={doseForm.medication} onChange={(e) => setDoseForm({ ...doseForm, medication: e.target.value })}>
                {MEDICATIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Frequency (e.g. every 8h)" className="w-full px-3 py-2 border rounded-lg" value={doseForm.frequency} onChange={(e) => setDoseForm({ ...doseForm, frequency: e.target.value })} />
                <input type="text" placeholder="Duration (e.g. 7 days)" className="w-full px-3 py-2 border rounded-lg" value={doseForm.duration} onChange={(e) => setDoseForm({ ...doseForm, duration: e.target.value })} />
              </div>
              <textarea placeholder="Notes" className="w-full px-3 py-2 border rounded-lg" value={doseForm.notes} onChange={(e) => setDoseForm({ ...doseForm, notes: e.target.value })} />
              <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded-lg">Calculate Dose</button>
            </form>

            {doseResult && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800">Calculated Dose</h3>
                <p className="text-2xl font-bold text-green-700">{doseResult.data.calculatedDose} {doseResult.data.unit}</p>
                <p className="text-sm text-green-600 mt-1">{doseResult.reference}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Calculations</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {doseHistory?.map((d: any) => (
                <div key={d.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium">{d.medication}</span>
                    <span className="text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600">{d.patientName} • {d.calculatedDose} {d.unit}</p>
                </div>
              ))}
              {(!doseHistory || doseHistory.length === 0) && <p className="text-gray-500 text-center py-4">No calculations yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* BMI */}
      {activeTab === 'bmi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">BMI Calculator</h2>
            <form onSubmit={handleBMI} className="space-y-4">
              <input type="text" placeholder="Patient Name" className="w-full px-3 py-2 border rounded-lg" value={bmiForm.patientName} onChange={(e) => setBmiForm({ ...bmiForm, patientName: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Height (cm) *" required className="w-full px-3 py-2 border rounded-lg" value={bmiForm.patientHeight} onChange={(e) => setBmiForm({ ...bmiForm, patientHeight: e.target.value })} />
                <input type="number" placeholder="Weight (kg) *" required className="w-full px-3 py-2 border rounded-lg" value={bmiForm.patientWeight} onChange={(e) => setBmiForm({ ...bmiForm, patientWeight: e.target.value })} />
              </div>
              <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded-lg">Calculate BMI</button>
            </form>

            {bmiResult && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800">BMI Result</h3>
                <p className="text-2xl font-bold text-green-700">{bmiResult.bmi} kg/m²</p>
                <p className="text-sm text-green-600 mt-1">Category: <strong>{bmiResult.category}</strong></p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">BMI Reference</h2>
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 rounded-lg"><strong>Underweight:</strong> {'<'} 18.5</div>
              <div className="p-3 bg-green-50 rounded-lg"><strong>Normal:</strong> 18.5 - 24.9</div>
              <div className="p-3 bg-yellow-50 rounded-lg"><strong>Overweight:</strong> 25 - 29.9</div>
              <div className="p-3 bg-orange-50 rounded-lg"><strong>Obese Class I:</strong> 30 - 34.9</div>
              <div className="p-3 bg-red-50 rounded-lg"><strong>Obese Class II:</strong> 35 - 39.9</div>
              <div className="p-3 bg-red-100 rounded-lg"><strong>Obese Class III:</strong> ≥ 40</div>
            </div>
          </div>
        </div>
      )}

      {/* Monitoring */}
      {activeTab === 'monitor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Add Patient Record</h2>
            <form onSubmit={handleRecord} className="space-y-4">
              <input type="text" placeholder="Patient Name" className="w-full px-3 py-2 border rounded-lg" value={recordForm.patientName} onChange={(e) => setRecordForm({ ...recordForm, patientName: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Age" className="w-full px-3 py-2 border rounded-lg" value={recordForm.patientAge} onChange={(e) => setRecordForm({ ...recordForm, patientAge: e.target.value })} />
                <input type="number" placeholder="Weight (kg)" className="w-full px-3 py-2 border rounded-lg" value={recordForm.patientWeight} onChange={(e) => setRecordForm({ ...recordForm, patientWeight: e.target.value })} />
              </div>
              <select className="w-full px-3 py-2 border rounded-lg" value={recordForm.recordType} onChange={(e) => setRecordForm({ ...recordForm, recordType: e.target.value })}>
                {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Value *" required className="w-full px-3 py-2 border rounded-lg" value={recordForm.value} onChange={(e) => setRecordForm({ ...recordForm, value: e.target.value })} />
                <input type="text" placeholder="Unit (e.g. mmHg, mg/dL)" className="w-full px-3 py-2 border rounded-lg" value={recordForm.unit} onChange={(e) => setRecordForm({ ...recordForm, unit: e.target.value })} />
              </div>
              <textarea placeholder="Notes" className="w-full px-3 py-2 border rounded-lg" value={recordForm.notes} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} />
              <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded-lg">Save Record</button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Patient Records</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {patientRecords?.map((r: any) => (
                <div key={r.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium">{r.patientName}</span>
                    <span className="text-sm text-gray-500">{new Date(r.recordedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-gray-600">{r.recordType}: <strong>{r.value} {r.unit}</strong></p>
                </div>
              ))}
              {(!patientRecords || patientRecords.length === 0) && <p className="text-gray-500 text-center py-4">No records yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* Device Records */}
      {activeTab === 'device' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Temperature & Humidity Record</h2>
            <form onSubmit={handleDevice} className="space-y-4">
              <input type="text" placeholder="Device Name *" required className="w-full px-3 py-2 border rounded-lg" value={deviceForm.deviceName} onChange={(e) => setDeviceForm({ ...deviceForm, deviceName: e.target.value })} />
              <select className="w-full px-3 py-2 border rounded-lg" value={deviceForm.deviceType} onChange={(e) => setDeviceForm({ ...deviceForm, deviceType: e.target.value })}>
                <option value="THERMOMETER">Thermometer</option>
                <option value="HYGROMETER">Hygrometer</option>
                <option value="REFRIGERATOR">Refrigerator</option>
                <option value="OTHER">Other</option>
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Temperature (°C)" className="w-full px-3 py-2 border rounded-lg" value={deviceForm.temperature} onChange={(e) => setDeviceForm({ ...deviceForm, temperature: e.target.value })} />
                <input type="number" placeholder="Humidity (%)" className="w-full px-3 py-2 border rounded-lg" value={deviceForm.humidity} onChange={(e) => setDeviceForm({ ...deviceForm, humidity: e.target.value })} />
              </div>
              <input type="text" placeholder="Location" className="w-full px-3 py-2 border rounded-lg" value={deviceForm.location} onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })} />
              <textarea placeholder="Notes" className="w-full px-3 py-2 border rounded-lg" value={deviceForm.notes} onChange={(e) => setDeviceForm({ ...deviceForm, notes: e.target.value })} />
              <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded-lg">Save Reading</button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Device Readings</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {deviceRecords?.map((r: any) => (
                <div key={r.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium">{r.deviceName}</span>
                    <span className="text-sm text-gray-500">{new Date(r.readingTime).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {r.temperature !== null && <>🌡️ {r.temperature}°C </>}
                    {r.humidity !== null && <>💧 {r.humidity}%</>}
                  </p>
                </div>
              ))}
              {(!deviceRecords || deviceRecords.length === 0) && <p className="text-gray-500 text-center py-4">No readings yet</p>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
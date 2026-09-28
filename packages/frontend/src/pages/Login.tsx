// packages/frontend/src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

// ✅ Role display config
const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  ADMIN: { label: 'Admin', color: 'text-red-600', icon: '👑' },
  OWNER: { label: 'Owner', color: 'text-purple-600', icon: '⭐' },
  PHARMACIST: { label: 'Pharmacist', color: 'text-blue-600', icon: '💊' },
  NURSE: { label: 'Nurse', color: 'text-green-600', icon: '🩺' },
  ACCOUNTANT: { label: 'Accountant', color: 'text-orange-600', icon: '💰' },
};

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedRole, setDetectedRole] = useState<string>('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });


  // ✅ Detect role from email
  const detectRole = (email: string) => {
    if (email.includes('admin')) return 'ADMIN';
    if (email.includes('owner')) return 'OWNER';
    if (email.includes('pharmacist')) return 'PHARMACIST';
    if (email.includes('nurse')) return 'NURSE';
    if (email.includes('accountant')) return 'ACCOUNTANT';
    return '';
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/login', data);
      const user = response.user;
      
      // ✅ Check if role is valid
      const role = user.role || detectRole(data.email);
      if (!role || !ROLE_CONFIG[role]) {
        toast.error('Invalid user role. Please contact administrator.');
        return;
      }

      login(response.token, user);
      toast.success(`Welcome ${ROLE_CONFIG[role].icon} ${ROLE_CONFIG[role].label}!`);
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🏥 Pharmacy PMS</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
          
          {/* ✅ Show detected role */}
          {detectedRole && ROLE_CONFIG[detectedRole] && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
              <span className="text-xl">{ROLE_CONFIG[detectedRole].icon}</span>
              <span className={`text-sm font-medium ${ROLE_CONFIG[detectedRole].color}`}>
                {ROLE_CONFIG[detectedRole].label} Role Detected
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              {...register('email')}
              type="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="admin@pharmacy.com"
              onChange={(e) => {
                const role = detectRole(e.target.value);
                setDetectedRole(role);
              }}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              {...register('password')}
              type="password"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="••••••••"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* ✅ Role demo credentials */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="font-medium">Demo Credentials:</p>
          <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
            <p className="font-mono">👑 admin@pharmacy.com / Admin@2024</p>
            <p className="font-mono">⭐ owner@pharmacy.com / Owner@2024</p>
            <p className="font-mono">💊 pharmacist@pharmacy.com / Pharma@2024</p>
            <p className="font-mono">🩺 nurse@pharmacy.com / Nurse@2024</p>
            <p className="font-mono">💰 accountant@pharmacy.com / Account@2024</p>
          </div>
        </div>
      </div>
    </div>
  );
}

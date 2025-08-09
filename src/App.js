import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Utility functions
const formatDateTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const isSlotInPast = (dateStr) => {
  return new Date(dateStr) <= new Date();
};

const isSlotSoon = (dateStr) => {
  const slotTime = new Date(dateStr);
  const now = new Date();
  const hoursDiff = (slotTime - now) / (1000 * 60 * 60);
  return hoursDiff <= 24 && hoursDiff > 0;
};

// Auth Context
const AuthContext = React.createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        // Verify token is not expired
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        if (tokenPayload.exp * 1000 > Date.now()) {
          setUser(JSON.parse(userData));
        } else {
          // Token expired, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = (token, userData, role) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ ...userData, role }));
    setUser({ ...userData, role });
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// API utility functions
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    ...options
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401 || response.status === 403) {
        // Token expired or invalid, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
        return;
      }
      throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your connection.');
    }
    throw error;
  }
};

// Hook for managing messages
const useMessages = () => {
  const [messages, setMessages] = useState([]);

  const addMessage = useCallback((message, type = 'error') => {
    const id = Date.now();
    setMessages(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id));
    }, 5000);
  }, []);

  const removeMessage = useCallback((id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, addMessage, removeMessage, clearMessages };
};

// Components
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <span>{message}</span>
  </div>
);

const MessageContainer = ({ messages, onRemove }) => (
  <div className="message-container">
    {messages.map(({ id, message, type }) => (
      <div key={id} className={`message ${type}-message`}>
        <span>{message}</span>
        <button onClick={() => onRemove(id)} aria-label="Close message">×</button>
      </div>
    ))}
  </div>
);

const LoginForm = ({ onSwitchToRegister }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { messages, addMessage, removeMessage } = useMessages();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      login(response.token, response.user, response.role);
      addMessage('Login successful!', 'success');
    } catch (err) {
      addMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillTestCredentials = (type) => {
    if (type === 'patient') {
      setFormData({ email: 'patient@example.com', password: 'Passw0rd!' });
    } else {
      setFormData({ email: 'admin@example.com', password: 'Passw0rd!' });
    }
  };

  return (
    <div className="auth-form">
      <h2>Login to Your Account</h2>
      <MessageContainer messages={messages} onRemove={removeMessage} />
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? (
            <>
              <span className="button-spinner"></span>
              Logging in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
      
      <div className="auth-footer">
        <p>
          Don't have an account?{' '}
          <button className="link-button" onClick={onSwitchToRegister}>
            Create account
          </button>
        </p>
      </div>

      <div className="test-credentials">
        <h4>Demo Credentials</h4>
        <div className="credentials-buttons">
          <button 
            type="button" 
            className="credential-button patient"
            onClick={() => fillTestCredentials('patient')}
          >
            Try as Patient
          </button>
          <button 
            type="button" 
            className="credential-button admin"
            onClick={() => fillTestCredentials('admin')}
          >
            Try as Admin
          </button>
        </div>
        <div className="credentials-info">
          <p><strong>Patient:</strong> patient@example.com</p>
          <p><strong>Admin:</strong> admin@example.com</p>
        </div>
      </div>
    </div>
  );
};

const RegisterForm = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { messages, addMessage, removeMessage } = useMessages();

  const validatePassword = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    return strength;
  };

  useEffect(() => {
    setPasswordStrength(validatePassword(formData.password));
  }, [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      addMessage('Passwords do not match');
      return;
    }

    if (passwordStrength < 5) {
      addMessage('Password must contain at least 8 characters with uppercase, lowercase, number, and special character');
      return;
    }

    setLoading(true);

    try {
      await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });
      
      addMessage('Registration successful! Please log in.', 'success');
      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      setTimeout(() => onSwitchToLogin(), 2000);
    } catch (err) {
      addMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthText = () => {
    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return levels[Math.max(0, passwordStrength - 1)] || 'Very Weak';
  };

  const getPasswordStrengthColor = () => {
    const colors = ['#ff4444', '#ff8800', '#ffaa00', '#88cc00', '#44cc44'];
    return colors[Math.max(0, passwordStrength - 1)] || '#ff4444';
  };

  return (
    <div className="auth-form">
      <h2>Create Your Account</h2>
      <MessageContainer messages={messages} onRemove={removeMessage} />
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="text"
            placeholder="Full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoComplete="name"
          />
        </div>
        <div className="form-group">
          <input
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            autoComplete="new-password"
          />
          {formData.password && (
            <div className="password-strength">
              <div 
                className="strength-bar" 
                style={{ 
                  width: `${(passwordStrength / 5) * 100}%`,
                  backgroundColor: getPasswordStrengthColor()
                }}
              ></div>
              <span style={{ color: getPasswordStrengthColor() }}>
                {getPasswordStrengthText()}
              </span>
            </div>
          )}
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Confirm password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            autoComplete="new-password"
          />
          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <div className="password-mismatch">Passwords do not match</div>
          )}
        </div>
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? (
            <>
              <span className="button-spinner"></span>
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>
      
      <div className="auth-footer">
        <p>
          Already have an account?{' '}
          <button className="link-button" onClick={onSwitchToLogin}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Appointment Booking System</h1>
          <p>Book your appointments with ease</p>
        </div>
        {isLogin ? (
          <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
};

const SlotCard = React.memo(({ slot, onBook, isBooking }) => {
  const isPast = isSlotInPast(slot.startAt);
  const isSoon = isSlotSoon(slot.startAt);

  return (
    <div className={`slot-card ${isPast ? 'past' : ''} ${isSoon ? 'soon' : ''}`}>
      <div className="slot-date">{formatDate(slot.startAt)}</div>
      <div className="slot-time">
        {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
      </div>
      <button 
        onClick={() => onBook(slot.id)}
        disabled={isPast || isBooking}
        className={`book-button ${isPast ? 'disabled' : ''}`}
      >
        {isBooking ? 'Booking...' : isPast ? 'Past' : 'Book Slot'}
      </button>
      {isSoon && <div className="soon-badge">Soon!</div>}
    </div>
  );
});

const SlotsList = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const { messages, addMessage, removeMessage } = useMessages();

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const fromDate = dateRange.from || today.toISOString().split('T')[0];
      const toDate = dateRange.to || nextWeek.toISOString().split('T')[0];

      const response = await apiRequest(`/slots?from=${fromDate}&to=${toDate}`);
      setSlots(response);
    } catch (err) {
      addMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange, addMessage]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleBookSlot = async (slotId) => {
    setBookingSlot(slotId);
    try {
      await apiRequest('/book', {
        method: 'POST',
        body: JSON.stringify({ slotId })
      });
      
      addMessage('Slot booked successfully!', 'success');
      // Remove the booked slot from the list
      setSlots(prev => prev.filter(slot => slot.id !== slotId));
    } catch (err) {
      addMessage(err.message);
    } finally {
      setBookingSlot(null);
    }
  };

  const groupedSlots = useMemo(() => {
    const groups = {};
    slots.forEach(slot => {
      const date = slot.startAt.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(slot);
    });
    
    // Sort slots within each date
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    });
    
    return groups;
  }, [slots]);

  if (loading) return <LoadingSpinner message="Loading available slots..." />;

  return (
    <div className="slots-list">
      <div className="section-header">
        <h3>Available Appointments</h3>
        <div className="date-filters">
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            placeholder="From date"
          />
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            placeholder="To date"
          />
          <button onClick={fetchSlots} className="refresh-button">
            Refresh
          </button>
        </div>
      </div>

      <MessageContainer messages={messages} onRemove={removeMessage} />

      {slots.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h4>No available slots</h4>
          <p>Please try a different date range or check back later.</p>
        </div>
      ) : (
        <div className="slots-by-date">
          {Object.entries(groupedSlots).map(([date, daySlots]) => (
            <div key={date} className="day-group">
              <h4 className="day-header">{formatDate(date + 'T00:00:00')}</h4>
              <div className="slots-grid">
                {daySlots.map(slot => (
                  <SlotCard 
                    key={slot.id}
                    slot={slot}
                    onBook={handleBookSlot}
                    isBooking={bookingSlot === slot.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BookingCard = React.memo(({ booking, onCancel, isCancelling }) => {
  const isPast = isSlotInPast(booking.slot.startAt);
  const canCancel = !isPast && !isCancelling;

  return (
    <div className={`booking-card ${isPast ? 'past' : ''}`}>
      <div className="booking-header">
        <div className="booking-date">{formatDate(booking.slot.startAt)}</div>
        <div className="booking-status">{isPast ? 'Completed' : 'Upcoming'}</div>
      </div>
      <div className="booking-details">
        <div className="booking-time">
          {formatTime(booking.slot.startAt)} - {formatTime(booking.slot.endAt)}
        </div>
        <div className="booking-meta">
          Booked on {formatDateTime(booking.createdAt)}
        </div>
      </div>
      {canCancel && onCancel && (
        <button 
          onClick={() => onCancel(booking.id)}
          disabled={isCancelling}
          className="cancel-button"
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
        </button>
      )}
    </div>
  );
});

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const { messages, addMessage, removeMessage } = useMessages();

  const fetchBookings = useCallback(async () => {
    try {
      const response = await apiRequest('/my-bookings');
      setBookings(response);
    } catch (err) {
      addMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [addMessage]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancelBooking = async (bookingId) => {
    setCancellingBooking(bookingId);
    try {
      await apiRequest(`/bookings/${bookingId}`, {
        method: 'DELETE'
      });
      
      addMessage('Booking cancelled successfully!', 'success');
      setBookings(prev => prev.filter(booking => booking.id !== bookingId));
    } catch (err) {
      addMessage(err.message);
    } finally {
      setCancellingBooking(null);
    }
  };

  const { upcomingBookings, pastBookings } = useMemo(() => {
    const now = new Date();
    return bookings.reduce((acc, booking) => {
      if (new Date(booking.slot.startAt) > now) {
        acc.upcomingBookings.push(booking);
      } else {
        acc.pastBookings.push(booking);
      }
      return acc;
    }, { upcomingBookings: [], pastBookings: [] });
  }, [bookings]);

  if (loading) return <LoadingSpinner message="Loading your bookings..." />;

  return (
    <div className="my-bookings">
      <div className="section-header">
        <h3>My Appointments</h3>
        <button onClick={fetchBookings} className="refresh-button">
          Refresh
        </button>
      </div>

      <MessageContainer messages={messages} onRemove={removeMessage} />

      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h4>No appointments</h4>
          <p>You haven't booked any appointments yet.</p>
        </div>
      ) : (
        <>
          {upcomingBookings.length > 0 && (
            <div className="bookings-section">
              <h4>Upcoming Appointments ({upcomingBookings.length})</h4>
              <div className="bookings-list">
                {upcomingBookings.map(booking => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onCancel={handleCancelBooking}
                    isCancelling={cancellingBooking === booking.id}
                  />
                ))}
              </div>
            </div>
          )}

          {pastBookings.length > 0 && (
            <div className="bookings-section">
              <h4>Past Appointments ({pastBookings.length})</h4>
              <div className="bookings-list">
                {pastBookings.map(booking => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PatientDashboard = () => {
  const [currentView, setCurrentView] = useState('slots');

  return (
    <div className="dashboard">
      <div className="dashboard-nav">
        <button 
          className={currentView === 'slots' ? 'active' : ''}
          onClick={() => setCurrentView('slots')}
        >
          <span className="nav-icon">🗓️</span>
          Available Slots
        </button>
        <button 
          className={currentView === 'bookings' ? 'active' : ''}
          onClick={() => setCurrentView('bookings')}
        >
          <span className="nav-icon">📋</span>
          My Bookings
        </button>
      </div>

      <div className="dashboard-content">
        {currentView === 'slots' && <SlotsList />}
        {currentView === 'bookings' && <MyBookings />}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const { messages, addMessage, removeMessage } = useMessages();

  const fetchAllBookings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await apiRequest(`/all-bookings?page=${page}&limit=${pagination.limit}`);
      
      if (response.bookings) {
        setBookings(response.bookings);
        setPagination(prev => ({ ...prev, ...response.pagination }));
      } else {
        // Fallback for older API format
        setBookings(response);
        setPagination(prev => ({ ...prev, total: response.length, totalPages: 1 }));
      }
    } catch (err) {
      addMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, addMessage]);

  useEffect(() => {
    fetchAllBookings();
  }, [fetchAllBookings]);

  const handlePageChange = (newPage) => {
    fetchAllBookings(newPage);
  };

  const { upcomingBookings, pastBookings } = useMemo(() => {
    const now = new Date();
    return bookings.reduce((acc, booking) => {
      if (new Date(booking.slot.startAt) > now) {
        acc.upcomingBookings.push(booking);
      } else {
        acc.pastBookings.push(booking);
      }
      return acc;
    }, { upcomingBookings: [], pastBookings: [] });
  }, [bookings]);

  if (loading) return <LoadingSpinner message="Loading all bookings..." />;

  return (
    <div className="admin-dashboard">
      <div className="section-header">
        <h3>All Bookings Management</h3>
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-number">{upcomingBookings.length}</span>
            <span className="stat-label">Upcoming</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{pastBookings.length}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{bookings.length}</span>
            <span className="stat-label">Total</span>
          </div>
        </div>
        <button onClick={() => fetchAllBookings(pagination.page)} className="refresh-button">
          Refresh
        </button>
      </div>

      <MessageContainer messages={messages} onRemove={removeMessage} />
      
      {bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h4>No bookings found</h4>
          <p>No appointments have been booked yet.</p>
        </div>
      ) : (
        <>
          <div className="bookings-table">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Email</th>
                  <th>Appointment Date</th>
                  <th>Time Slot</th>
                  <th>Booked On</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const isPast = isSlotInPast(booking.slot.startAt);
                  return (
                    <tr key={booking.id} className={isPast ? 'past-booking' : 'upcoming-booking'}>
                      <td>
                        <div className="patient-info">
                          <strong>{booking.user.name}</strong>
                        </div>
                      </td>
                      <td>{booking.user.email}</td>
                      <td>{formatDate(booking.slot.startAt)}</td>
                      <td>
                        {formatTime(booking.slot.startAt)} - {formatTime(booking.slot.endAt)}
                      </td>
                      <td>{formatDateTime(booking.createdAt)}</td>
                      <td>
                        <span className={`status-badge ${isPast ? 'completed' : 'upcoming'}`}>
                          {isPast ? 'Completed' : 'Upcoming'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="page-button"
              >
                Previous
              </button>
              
              <div className="page-info">
                Page {pagination.page} of {pagination.totalPages}
                <span className="total-count">({pagination.total} total)</span>
              </div>
              
              <button 
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="page-button"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="main-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🏥 Appointment Booking</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">Welcome, {user.name}</span>
              <span className="user-role">{user.role === 'admin' ? '👑 Administrator' : '👤 Patient'}</span>
            </div>
            <button onClick={logout} className="logout-button">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {user.role === 'admin' ? <AdminDashboard /> : <PatientDashboard />}
    </div>
  );
};

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <LoadingSpinner message="Initializing application..." />
      </div>
    );
  }

  return (
    <div className="App">
      {user ? <Dashboard /> : <AuthPage />}
    </div>
  );
};

const AppWithAuth = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

export default AppWithAuth;
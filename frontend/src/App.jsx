import React, { useState, useEffect } from 'react';
import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
axios.defaults.withCredentials = true;

function App() {
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [simulatedToken, setSimulatedToken] = useState('');
  const [verifyTokenInput, setVerifyTokenInput] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  
  const [resume, setResume] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [isCreatingResume, setIsCreatingResume] = useState(false);
  
  const [resumeForm, setResumeForm] = useState({
    fullName: '',
    title: '',
    phone: '',
    summary: '',
    experience: '',
    education: '',
    skills: ''
  });

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const res = await axios.get('/api/session');
      if (res.data.loggedIn) {
        setUser(res.data.user);
        setView('dashboard');
        if (res.data.user.emailValidated) {
          fetchResume();
        }
      }
    } catch (err) {
      console.error('Session validation failed', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResume = async () => {
    setResumeLoading(true);
    try {
      const res = await axios.get('/api/resumes/my');
      setResume(res.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setResume(null);
      } else {
        console.error('Error fetching resume', err);
      }
    } finally {
      setResumeLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await axios.post('/api/signup', { email, password });
      setSuccess('Signup successful! Check validation token below.');
      
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (res.data.validationToken && isLocalhost) {
        setSimulatedToken(res.data.validationToken);
        setVerifyTokenInput(res.data.validationToken);
      }
      
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setView('login');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await axios.post('/api/login', { email, password });
      setUser(res.data.user);
      setView('dashboard');
      
      if (res.data.user.emailValidated) {
        fetchResume();
      } else {
        setResume(null);
      }
      
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      setUser(null);
      setResume(null);
      setView('login');
      setError('');
      setSuccess('');
    }
  };

  const handleOtpChange = (index, value) => {
    if (value && isNaN(value)) return; // Only allow numbers
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Focus next input automatically
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
        // Clear previous digit too when hitting backspace on empty box
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');
    if (!user?.email) {
      setError('No user email found to resend verification.');
      return;
    }
    try {
      await axios.post('/api/resend', { email: user.email });
      setSuccess('Verification code resent successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend verification code.');
    }
  };

  const handleVerifyEmail = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccess('');

    const joinedOtp = otpDigits.join('').trim();
    const token = joinedOtp || verifyTokenInput || simulatedToken;
    if (!token) {
      setError('Please provide validation token.');
      return;
    }

    try {
      await axios.post('/api/verify', { token });
      setSuccess('Email validated!');
      setUser(prev => ({ ...prev, emailValidated: true }));
      setSimulatedToken('');
      setVerifyTokenInput('');
      setOtpDigits(['', '', '', '', '', '']);
      fetchResume();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Invalid or expired token.');
    }
  };

  const openCreateResume = () => {
    setResumeForm({
      fullName: '',
      title: '',
      phone: '',
      summary: '',
      experience: '',
      education: '',
      skills: ''
    });
    setIsCreatingResume(true);
    setIsEditingResume(false);
  };

  const openEditResume = () => {
    if (!resume) return;
    setResumeForm({
      fullName: resume.fullName || '',
      title: resume.title || '',
      phone: resume.phone || '',
      summary: resume.summary || '',
      experience: resume.experience || '',
      education: resume.education || '',
      skills: resume.skills || ''
    });
    setIsEditingResume(true);
    setIsCreatingResume(false);
  };

  const handleSaveResume = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isCreatingResume) {
        const res = await axios.post('/api/resumes', resumeForm);
        setResume(res.data);
        setSuccess('Resume created.');
      } else if (isEditingResume) {
        const res = await axios.put('/api/resumes/my', resumeForm);
        setResume(res.data);
        setSuccess('Resume updated.');
      }
      setIsCreatingResume(false);
      setIsEditingResume(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save resume');
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Delete resume?')) return;
    setError('');
    setSuccess('');

    try {
      await axios.delete('/api/resumes/my');
      setResume(null);
      setSuccess('Resume deleted.');
      setIsEditingResume(false);
      setIsCreatingResume(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete resume');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Loading Portal...
        </div>
      </div>
    );
  }

  if (view === 'login' || view === 'signup') {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-left-column">
          <div className="auth-form-container">
            <div className="auth-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6366f1' }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>PortalAuth</span>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {view === 'login' ? (
              <>
                <h1 className="auth-title">Holla,<br />Welcome Back</h1>
                <p className="auth-subtitle">Hey, welcome back to your special place</p>

                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="auth-label" htmlFor="login-email">Email Address</label>
                    <input
                      type="email"
                      id="login-email"
                      className="auth-input"
                      placeholder="stanley@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="auth-label" htmlFor="login-password">Password</label>
                    <input
                      type="password"
                      id="login-password"
                      className="auth-input"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="auth-remember-row">
                    <label>
                      <input type="checkbox" defaultChecked /> Remember me
                    </label>
                    <a href="#forgot" onClick={(e) => e.preventDefault()}>Forgot Password?</a>
                  </div>

                  <button type="submit" className="auth-btn">
                    Sign In
                  </button>
                </form>

                <div className="auth-footer">
                  Don't have an account?{' '}
                  <button onClick={() => { setView('signup'); setError(''); setSuccess(''); }}>
                    Sign Up
                  </button>
                </div>
              </>
            ) : (
              <>
                <h1 className="auth-title">Create<br />Your Account</h1>
                <p className="auth-subtitle">Join us to build and access your resume dashboard</p>

                <form onSubmit={handleSignup}>
                  <div className="form-group">
                    <label className="auth-label" htmlFor="signup-email">Email Address</label>
                    <input
                      type="email"
                      id="signup-email"
                      className="auth-input"
                      placeholder="stanley@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="auth-label" htmlFor="signup-password">Password</label>
                    <input
                      type="password"
                      id="signup-password"
                      className="auth-input"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="auth-label" htmlFor="signup-confirm-password">Confirm Password</label>
                    <input
                      type="password"
                      id="signup-confirm-password"
                      className="auth-input"
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="auth-btn" style={{ marginTop: '1rem' }}>
                    Sign Up
                  </button>
                </form>

                <div className="auth-footer">
                  Already have an account?{' '}
                  <button onClick={() => { setView('login'); setError(''); setSuccess(''); }}>
                    Log In
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="auth-right-column">
          <div className="auth-illustration-container">
            <img src="/auth_illustration.png" alt="Secure Illustration" className="auth-illustration-img" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      <header className="navbar">
        <div className="navbar-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span style={{ background: 'linear-gradient(135deg, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            PortalAuth
          </span>
        </div>
        
        {user && (
          <div className="navbar-user">
            <span>Logged in as: <strong>{user.email}</strong></span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="container">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {view === 'dashboard' && user && (
          <div className="dashboard-container">
            {!user.emailValidated ? (
              <div className="verify-card animate-fade-in">
                <h2>Verification Code</h2>
                <p>Enter the code sent to your email address: <strong>{user.email}</strong></p>
                
                <form onSubmit={handleVerifyEmail}>
                  <div className="otp-inputs-container">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        id={`otp-input-${index}`}
                        type="text"
                        maxLength="1"
                        className="otp-digit-input"
                        value={otpDigits[index]}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        required
                      />
                    ))}
                  </div>
                  
                  <button type="submit" className="auth-btn">
                    Verify
                  </button>
                </form>

                <div className="verify-footer-text">
                  Didn't receive a code?{' '}
                  <button onClick={handleResendCode} type="button">
                    Resend Code
                  </button>
                </div>

                {simulatedToken && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                  <div className="simulated-inbox" style={{ maxWidth: '400px', margin: '2rem auto 0 auto' }}>
                    <h4 style={{ color: '#111827' }}>📬 Simulated Validation Token</h4>
                    <p style={{ fontSize: '0.8rem', margin: '0.25rem 0', color: '#6b7280' }}>
                      Token: <code>{simulatedToken}</code>
                    </p>
                    <button onClick={handleVerifyEmail} className="btn btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.35rem 1rem', background: '#f3f4f6', borderColor: '#d1d5db', color: '#374151' }}>
                      Auto Validate Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="verify-banner validated">
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                <h3 style={{ color: 'var(--success-color)' }}>Portal Unlocked</h3>
                <p style={{ fontSize: '1.1rem', margin: '0.75rem 0 0 0' }}>
                  Your email is validated. You can access the portal
                </p>
              </div>
            )}

            {user.emailValidated && (
              <div style={{ marginTop: '2rem' }}>
                {resumeLoading ? (
                  <div className="glass-card" style={{ maxWidth: '100%', textAlign: 'center' }}>
                    <p>Loading resume details...</p>
                  </div>
                ) : (
                  <>
                    {(isCreatingResume || isEditingResume) ? (
                      <div className="resume-view animate-fade-in">
                        <h3>{isCreatingResume ? 'Create Resume' : 'Edit Resume'}</h3>
                        <p style={{ marginBottom: '2rem' }}>Fill in your professional credentials below.</p>
                        
                        <form onSubmit={handleSaveResume}>
                          <div className="resume-form-grid">
                            <div className="form-group">
                              <label className="form-label">Full Name</label>
                              <input 
                                type="text" 
                                className="form-input" 
                                placeholder="John Doe"
                                value={resumeForm.fullName}
                                onChange={(e) => setResumeForm(prev => ({ ...prev, fullName: e.target.value }))}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Professional Title</label>
                              <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Lead Software Engineer"
                                value={resumeForm.title}
                                onChange={(e) => setResumeForm(prev => ({ ...prev, title: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input 
                              type="tel" 
                              className="form-input" 
                              placeholder="+1 (555) 000-0000"
                              value={resumeForm.phone}
                              onChange={(e) => setResumeForm(prev => ({ ...prev, phone: e.target.value }))}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Professional Summary</label>
                            <textarea 
                              className="form-input" 
                              rows="3"
                              placeholder="Describe your profile and main career accomplishments..."
                              value={resumeForm.summary}
                              onChange={(e) => setResumeForm(prev => ({ ...prev, summary: e.target.value }))}
                              style={{ resize: 'vertical', minHeight: '80px' }}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Work Experience</label>
                            <textarea 
                              className="form-input" 
                              rows="5"
                              placeholder="- Senior Dev at Tech Corp (2023 - Present)&#10;- Software Developer at Soft Solutions (2021 - 2023)"
                              value={resumeForm.experience}
                              onChange={(e) => setResumeForm(prev => ({ ...prev, experience: e.target.value }))}
                              style={{ resize: 'vertical', minHeight: '120px' }}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Education</label>
                            <textarea 
                              className="form-input" 
                              rows="3"
                              placeholder="M.S. in Computer Science - Stanford University (2019-2021)"
                              value={resumeForm.education}
                              onChange={(e) => setResumeForm(prev => ({ ...prev, education: e.target.value }))}
                              style={{ resize: 'vertical', minHeight: '80px' }}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Skills (comma-separated)</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="JavaScript, React, Node.js, Java, Quarkus, SQL"
                              value={resumeForm.skills}
                              onChange={(e) => setResumeForm(prev => ({ ...prev, skills: e.target.value }))}
                            />
                          </div>

                          <div className="resume-form-actions">
                            <button type="button" onClick={() => { setIsCreatingResume(false); setIsEditingResume(false); }} className="btn btn-secondary" style={{ width: 'auto' }}>
                              Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                              Save Resume
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <>
                        {resume ? (
                          <div className="resume-view animate-fade-in">
                            <div className="resume-header">
                              <div className="resume-header-info">
                                <h2>{resume.fullName}</h2>
                                {resume.title && <div className="title-text">{resume.title}</div>}
                                {resume.phone && <div className="contact-text">📞 {resume.phone}</div>}
                              </div>
                              <div className="resume-actions">
                                <button onClick={openEditResume} className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                  ✏️ Edit
                                </button>
                                <button onClick={handleDeleteResume} className="btn btn-danger" style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                  🗑️ Delete
                                </button>
                              </div>
                            </div>

                            {resume.summary && (
                              <div className="resume-section">
                                <h3>Summary</h3>
                                <p>{resume.summary}</p>
                              </div>
                            )}

                            {resume.experience && (
                              <div className="resume-section">
                                <h3>Experience</h3>
                                <p>{resume.experience}</p>
                              </div>
                            )}

                            {resume.education && (
                              <div className="resume-section">
                                <h3>Education</h3>
                                <p>{resume.education}</p>
                              </div>
                            )}

                            {resume.skills && (
                              <div className="resume-section">
                                <h3>Skills</h3>
                                <div className="skills-tags">
                                  {resume.skills.split(',').map((skill, idx) => (
                                    <span key={idx} className="skill-tag">
                                      {skill.trim()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="glass-card" style={{ maxWidth: '100%', textAlign: 'center', padding: '4rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                            <h3>No Resume Found</h3>
                            <p>You haven't created a professional profile yet. Get started now!</p>
                            <button onClick={openCreateResume} className="btn btn-primary" style={{ width: 'auto', padding: '0.75rem 2rem' }}>
                              Create My Resume
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

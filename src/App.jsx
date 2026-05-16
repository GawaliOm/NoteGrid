import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, FileText, X, ArrowLeft, Lock, Download, CheckCircle, Shield, User, Trash2, Plus, Mail, Search, MessageSquare } from 'lucide-react';
import { openDB } from 'idb';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Setup pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// IndexedDB Initialization
const initDB = async () => {
  return openDB('NoteGridDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pdfs')) {
        db.createObjectStore('pdfs');
      }
    },
  });
};

export default function App() {
  const [activeView, setActiveView] = useState('subjects'); // subjects | preview | admin
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [currentPdfBuffer, setCurrentPdfBuffer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal & Auth State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [isRequestSuccess, setIsRequestSuccess] = useState(false);

  // Admin Auth State
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [authStep, setAuthStep] = useState(1); // 1: Select User, 2: Enter Password
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Admin Dashboard State
  const [capturedEmails, setCapturedEmails] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load Data on Mount
  useEffect(() => {
    const savedSubjects = localStorage.getItem('note_subjects');
    if (savedSubjects) {
      setSubjects(JSON.parse(savedSubjects));
    }
  }, []);

  // --------------- VIEW LOGIC ---------------

  const handleSubjectClick = async (subject) => {
    setSelectedSubject(subject);
    setActiveView('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load PDF from IDB
    const db = await initDB();
    const buffer = await db.get('pdfs', subject.id);
    setCurrentPdfBuffer(buffer);
  };

  const handleBack = () => {
    setActiveView('subjects');
    setSelectedSubject(null);
    setCurrentPdfBuffer(null);
  };

  // --------------- DOWNLOAD LOGIC ---------------

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    setEmailError('');

    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // Save to localStorage for Admin
      const existingEmails = JSON.parse(localStorage.getItem('admin_captured_emails') || '[]');
      existingEmails.push({
        email: email,
        subject: selectedSubject?.title,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('admin_captured_emails', JSON.stringify(existingEmails));

      setIsSubmitting(false);
      setIsSuccess(true);
    }, 800);
  };

  const handleDownload = () => {
    if (!currentPdfBuffer) return;
    const blob = new Blob([currentPdfBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSubject.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setIsSuccess(false);
      setEmail('');
      setEmailError('');
    }, 300);
  };

  // --------------- REQUEST LOGIC ---------------

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    if (!requestTitle) return;

    const existingRequests = JSON.parse(localStorage.getItem('user_requests') || '[]');
    existingRequests.push({
      title: requestTitle,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('user_requests', JSON.stringify(existingRequests));

    setIsRequestSuccess(true);
    setTimeout(() => {
      setIsRequestModalOpen(false);
      setIsRequestSuccess(false);
      setRequestTitle('');
    }, 2000);
  };

  // --------------- ADMIN LOGIC ---------------

  const openAdminLogin = () => {
    setIsAdminAuthOpen(true);
    setAuthStep(1);
    setAdminPassword('');
    setAdminError('');
  };

  const closeAdminLogin = () => {
    setIsAdminAuthOpen(false);
  };

  const handleAdminAuth = (e) => {
    e.preventDefault();
    if (adminPassword === 'Gawaliom007') {
      setIsAdminAuthOpen(false);
      setActiveView('admin');
      // Load emails and requests
      setCapturedEmails(JSON.parse(localStorage.getItem('admin_captured_emails') || '[]'));
      setUserRequests(JSON.parse(localStorage.getItem('user_requests') || '[]'));
      window.scrollTo(0, 0);
    } else {
      setAdminError('Incorrect password');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const file = e.target.file.files[0];

    if (!file || !title) return;

    setIsUploading(true);
    try {
      const id = Date.now().toString();
      const buffer = await file.arrayBuffer();

      const db = await initDB();
      await db.put('pdfs', buffer, id);

      const newSub = { id, title };
      const updated = [...subjects, newSub];
      setSubjects(updated);
      localStorage.setItem('note_subjects', JSON.stringify(updated));

      e.target.reset();
    } catch (err) {
      console.error(err);
      alert("Failed to upload PDF");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    const db = await initDB();
    await db.delete('pdfs', id);

    const updated = subjects.filter(s => s.id !== id);
    setSubjects(updated);
    localStorage.setItem('note_subjects', JSON.stringify(updated));
  };

  const handleDeleteRequest = (timestamp) => {
    const updated = userRequests.filter(r => r.timestamp !== timestamp);
    setUserRequests(updated);
    localStorage.setItem('user_requests', JSON.stringify(updated));
  };


  // --------------- PDF UTILS ---------------

  const PDFCover = ({ id }) => {
    const [buffer, setBuffer] = useState(null);
    useEffect(() => {
      initDB().then(db => db.get('pdfs', id)).then(setBuffer);
    }, [id]);

    if (!buffer) return <div style={{ width: '100%', height: '100%', background: '#E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <Document file={buffer} loading={<div style={{ padding: '20px' }}>Loading PDF...</div>}>
          <Page pageNumber={1} width={300} renderTextLayer={false} renderAnnotationLayer={false} />
        </Document>
      </div>
    );
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <header className="navbar container">
        <div className="logo" onClick={() => { setActiveView('subjects'); window.scrollTo(0, 0); }} style={{ cursor: 'pointer' }}>
          <BookOpen size={28} />
          <span>NoteGrid</span>
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search for notes..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="navbar-actions">
          <button onClick={() => setIsRequestModalOpen(true)} className="btn btn-text" style={{ fontSize: '0.875rem', gap: '4px' }}>
            <MessageSquare size={16} /> Request
          </button>
          <button onClick={openAdminLogin} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', padding: '8px 16px' }}>
            <Shield size={16} /> Admin
          </button>
        </div>
      </header>

      <main className="container" style={{ minHeight: '70vh' }}>
        <AnimatePresence mode="wait">

          {/* ================= SUBJECTS VIEW ================= */}
          {activeView === 'subjects' && (
            <motion.section
              key="subjects"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <div className="hero">
                <h1>Library</h1>
                <p>Access concise, exam-focused study materials designed to simplify complex topics, improve understanding, and help you prepare more effectively — completely free. Preview notes for your subject and access the full PDF instantly.</p>
              </div>

              {filteredSubjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', border: '1px dashed var(--card-border)', borderRadius: 'var(--radius-md)' }}>
                  {searchTerm ? "No results found for your search." : "No notes available yet."}
                </div>
              ) : (
                <div className="grid-container">
                  {filteredSubjects.map((subject, idx) => (
                    <motion.div
                      key={subject.id}
                      className="card"
                      onClick={() => handleSubjectClick(subject)}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <div className="card-cover" style={{ background: '#fff' }}>
                        <PDFCover id={subject.id} />
                        <div className="card-overlay">
                          <FileText size={32} color="white" />
                          <span style={{ color: 'white', marginTop: '8px', fontWeight: '500' }}>View Notes</span>
                        </div>
                      </div>
                      <h3 className="card-title">{subject.title}</h3>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {/* ================= PREVIEW VIEW ================= */}
          {activeView === 'preview' && (
            <motion.section
              key="preview"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <button className="btn-text" onClick={handleBack} style={{ marginBottom: '32px' }}>
                <ArrowLeft size={20} /> Back to Library
              </button>

              <div className="hero" style={{ padding: '0 0 60px' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{selectedSubject?.title}</h1>
                <p>Preview the first few pages below and download the complete PDF for free instantly to your device.</p>
              </div>

              <div style={{ paddingBottom: '120px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', borderBottom: '1px solid var(--card-border)', paddingBottom: '16px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Document Preview</h2>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Native PDF Render</span>
                </div>

                {!currentPdfBuffer ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>Loading PDF Engine...</div>
                ) : (
                  <div style={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: '24px',
                    paddingBottom: '20px',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'thin'
                  }}>
                    <Document file={currentPdfBuffer} loading="Processing PDF..." style={{ display: 'flex', gap: '24px' }}>
                      {[1, 2, 3, 4].map((num) => (
                        <motion.div
                          key={num}
                          className="preview-card"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: num * 0.1 }}
                          style={{ minWidth: '350px', flexShrink: 0 }}
                        >
                          <div className="preview-inner" style={{ display: 'flex', justifyContent: 'center', background: '#fff', overflow: 'hidden' }}>
                            <div className={num === 4 ? 'blur-layer' : ''} style={{ width: '100%' }}>
                              <Page
                                pageNumber={num}
                                width={350}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                              />
                            </div>
                            <div className="page-num">{num}</div>
                            {num === 4 && (
                              <div className="unlock-overlay">
                                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                                  <Download size={16} /> Download Full PDF
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </Document>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* ================= ADMIN DASHBOARD ================= */}
          {activeView === 'admin' && (
            <motion.section
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Admin Dashboard</h1>
                <button className="btn btn-secondary" onClick={() => setActiveView('subjects')}>Exit Admin</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>

                {/* Upload Section */}
                <div style={{ background: 'var(--card-bg)', padding: '32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={20} /> Upload New PDF Note</h2>
                  <form onSubmit={handleAddNote}>
                    <div className="input-group" style={{ marginTop: 0 }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '500' }}>Subject Title</label>
                      <input type="text" name="title" required placeholder="e.g. Machine Learning Basics" />
                    </div>
                    <div className="input-group">
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '500' }}>PDF File</label>
                      <input type="file" name="file" accept=".pdf" required style={{ padding: '10px', background: '#fff' }} />
                    </div>
                    <button type="submit" className="btn btn-primary w-full" disabled={isUploading}>
                      {isUploading ? 'Saving to Database...' : 'Upload to Library'}
                    </button>
                  </form>
                </div>

                {/* Manage Notes Section */}
                <div style={{ background: 'var(--card-bg)', padding: '32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', maxHeight: '400px', overflowY: 'auto' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} /> Manage Notes</h2>
                  {subjects.length === 0 ? <p style={{ color: 'var(--text-tertiary)' }}>No notes uploaded yet.</p> : null}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {subjects.map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#F5F5F5', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                        <span style={{ fontWeight: '500' }}>{s.title}</span>
                        <button onClick={() => handleDeleteNote(s.id)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* User Requests Section */}
                <div style={{ gridColumn: '1 / -1', background: 'var(--card-bg)', padding: '32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={20} /> User Requests</h2>
                  {userRequests.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)' }}>No requests yet.</p>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Requested Subject</th>
                          <th>Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userRequests.map((req, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: '500' }}>{req.title}</td>
                            <td style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{new Date(req.timestamp).toLocaleString()}</td>
                            <td>
                              <button onClick={() => handleDeleteRequest(req.timestamp)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Collected Emails Section */}
                <div style={{ gridColumn: '1 / -1', background: 'var(--card-bg)', padding: '32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={20} /> Collected Emails</h2>
                  {capturedEmails.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)' }}>No emails captured yet.</p>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Email</th>
                          <th>Subject</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {capturedEmails.map((entry, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: '500' }}>{entry.email}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{entry.subject}</td>
                            <td style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{new Date(entry.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
            </motion.section>
          )}

        </AnimatePresence>
      </main>

      {/* Subtle Footer */}
      <footer className="container" style={{ padding: '60px 24px', marginTop: '60px', borderTop: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span>© 2026 NoteGrid</span>
          <a href="mailto:gawali.om006@gmail.com" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Mail size={14} /> gawali.om006@gmail.com
          </a>
        </div>
        <p>Your ultimate source for high-quality study notes.</p>
      </footer>

      {/* ================= MODALS ================= */}

      {/* Request Note Modal */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsRequestModalOpen(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="close-btn" onClick={() => setIsRequestModalOpen(false)}><X size={20} /></button>

              {!isRequestSuccess ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="modal-icon"><MessageSquare size={28} /></div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: '600' }}>Request a Note</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Can't find what you're looking for? Let us know what subject you need.
                  </p>
                  <form onSubmit={handleRequestSubmit}>
                    <div className="input-group">
                      <input
                        type="text"
                        placeholder="e.g. Advanced AI, Chemistry..."
                        required
                        value={requestTitle}
                        onChange={(e) => setRequestTitle(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                      Submit Request
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="modal-icon" style={{ background: '#171717', color: '#FFFFFF' }}><CheckCircle size={28} /></div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: '600' }}>Request Received</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Thank you! We'll work on adding <strong>{requestTitle}</strong> to our library soon.
                  </p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Download Auth Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="close-btn" onClick={closeModal}><X size={20} /></button>

              {!isSuccess ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="modal-icon"><Lock size={28} /></div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: '600' }}>Download Document</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Enter email to download full pdf
                  </p>
                  <form onSubmit={handleModalSubmit}>
                    <div className="input-group">
                      <input
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                        disabled={isSubmitting}
                        className={emailError ? 'error' : ''}
                      />
                      {emailError && <span className="error-text">{emailError}</span>}
                    </div>
                    <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={isSubmitting}>
                      {isSubmitting ? 'Processing...' : 'Download'}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="modal-icon" style={{ background: '#171717', color: '#FFFFFF' }}><CheckCircle size={28} /></div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: '600' }}>Access Granted</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Your email has been verified. You can now download the complete document.
                  </p>
                  <button className="btn btn-primary w-full" style={{ justifyContent: 'center' }} onClick={handleDownload}>
                    Download Now <Download size={18} />
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {isAdminAuthOpen && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAdminLogin}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="close-btn" onClick={closeAdminLogin}><X size={20} /></button>

              {authStep === 1 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="modal-icon" style={{ borderRadius: '12px' }}><Shield size={28} /></div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: '600' }}>Admin Login</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>Select your account to continue.</p>

                  <button
                    style={{ width: '100%', padding: '16px', background: '#FAFAFA', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#A3A3A3'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--card-border)'}
                    onClick={() => setAuthStep(2)}
                  >
                    <div style={{ background: '#E5E5E5', padding: '12px', borderRadius: '50%' }}><User size={24} color="#525252" /></div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '600', fontSize: '1.125rem' }}>Om Gawali</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>System Administrator</div>
                    </div>
                  </button>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="modal-icon" style={{ borderRadius: '12px' }}><Lock size={28} /></div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: '600' }}>Enter Password</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>Verify your identity for Om Gawali.</p>
                  <form onSubmit={handleAdminAuth}>
                    <div className="input-group">
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => { setAdminPassword(e.target.value); setAdminError(''); }}
                        className={adminError ? 'error' : ''}
                        autoFocus
                      />
                      {adminError && <span className="error-text">{adminError}</span>}
                    </div>
                    <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                      Unlock Dashboard
                    </button>
                  </form>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, FileText, X, ArrowLeft, Lock, Download, CheckCircle, Shield, User, Trash2, Plus, Mail, Search, MessageSquare, Moon, Sun, UploadCloud } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Setup pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Supabase Client Initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [activeView, setActiveView] = useState('subjects'); // subjects | preview | admin
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState(null);
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
  const [studentContributions, setStudentContributions] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // User Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploadSuccess, setIsUploadSuccess] = useState(false);

  // Feedback State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isFeedbackSuccess, setIsFeedbackSuccess] = useState(false);
  const [userFeedback, setUserFeedback] = useState([]);

  // Load Data on Mount
  useEffect(() => {
    fetchNotes();
  }, []);

  // Theme Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const fetchNotes = async () => {
    const { data: notes, error: notesError } = await supabase.from('notes').select('*');
    const { data: uploads, error: uploadsError } = await supabase.from('user_uploads').select('*');

    if (!notesError && !uploadsError) {
      const formattedNotes = notes.map(n => ({ ...n, type: 'admin' }));
      const formattedUploads = uploads.map(u => ({
        ...u,
        title: u.subject ? `${u.subject} Notes` : 'Student Notes',
        author: u.name,
        type: 'user'
      }));

      const allNotes = [...formattedNotes, ...formattedUploads].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );
      setSubjects(allNotes);
    }
  };

  const fetchAdminData = async () => {
    const { data: emails } = await supabase.from('captured_emails').select('*').order('created_at', { ascending: false });
    const { data: requests } = await supabase.from('user_requests').select('*').order('created_at', { ascending: false });
    const { data: contributions } = await supabase.from('user_uploads').select('*').order('created_at', { ascending: false });
    const { data: feedbackData } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
    if (emails) setCapturedEmails(emails);
    if (requests) setUserRequests(requests);
    if (contributions) setStudentContributions(contributions);
    if (feedbackData) setUserFeedback(feedbackData);
  };

  // --------------- VIEW LOGIC ---------------

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject);
    setCurrentPdfUrl(subject.pdf_url);
    setActiveView('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setActiveView('subjects');
    setSelectedSubject(null);
    setCurrentPdfUrl(null);
  };

  // --------------- DOWNLOAD LOGIC ---------------

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleModalSubmit = async (e) => {
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

    const { error } = await supabase.from('captured_emails').insert([
      { email: email, subject: selectedSubject?.title }
    ]);

    if (!error) {
      setIsSubmitting(false);
      setIsSuccess(true);
    } else {
      setIsSubmitting(false);
      alert("Error saving email. Please try again.");
    }
  };

  const handleDownload = () => {
    if (!currentPdfUrl) return;
    const a = document.createElement('a');
    a.href = currentPdfUrl;
    a.download = `${selectedSubject.title}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!requestTitle) return;

    const { error } = await supabase.from('user_requests').insert([
      { title: requestTitle }
    ]);

    if (!error) {
      setIsRequestSuccess(true);
      setTimeout(() => {
        setIsRequestModalOpen(false);
        setIsRequestSuccess(false);
        setRequestTitle('');
      }, 2000);
    }
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
      fetchAdminData();
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `notes/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage.from('pdfs').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(filePath);

      // Insert metadata into table
      const { error: insertError } = await supabase.from('notes').insert([
        { title: title, pdf_url: publicUrl }
      ]);
      if (insertError) throw insertError;

      fetchNotes();
      e.target.reset();
    } catch (err) {
      console.error(err);
      alert("Failed to upload PDF: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteNote = async (subject) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    // Extract file path from URL (simple version)
    const urlParts = subject.pdf_url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `notes/${fileName}`;

    await supabase.storage.from('pdfs').remove([filePath]);
    await supabase.from('notes').delete().eq('id', subject.id);

    fetchNotes();
  };

  const handleDeleteRequest = async (id) => {
    await supabase.from('user_requests').delete().eq('id', id);
    fetchAdminData();
  };

  const handleUserUpload = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const studentClass = e.target.studentClass.value;
    const subject = e.target.subject.value;
    const file = e.target.file.files[0];

    if (!file || !name || !studentClass || !subject) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `user_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `user_uploads/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage.from('pdfs').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('pdfs').getPublicUrl(filePath);

      // Insert metadata into table
      const { error: insertError } = await supabase.from('user_uploads').insert([
        { name, student_class: studentClass, subject, pdf_url: publicUrl }
      ]);
      if (insertError) throw insertError;

      setIsUploadSuccess(true);
      fetchNotes(); // Refresh library
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setIsUploadSuccess(false);
      }, 2000);
      e.target.reset();
    } catch (err) {
      console.error(err);
      alert("Failed to upload material: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteContribution = async (contribution) => {
    if (!confirm("Are you sure you want to delete this contribution?")) return;

    const urlParts = contribution.pdf_url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `user_uploads/${fileName}`;

    await supabase.storage.from('pdfs').remove([filePath]);
    await supabase.from('user_uploads').delete().eq('id', contribution.id);

    fetchAdminData();
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const suggestion = e.target.suggestion.value;

    if (!name || !suggestion) return;

    const { error } = await supabase.from('feedback').insert([{ name, suggestion }]);

    if (!error) {
      setIsFeedbackSuccess(true);
      setTimeout(() => {
        setIsFeedbackModalOpen(false);
        setIsFeedbackSuccess(false);
      }, 2000);
      e.target.reset();
    }
  };

  const handleDeleteFeedback = async (id) => {
    await supabase.from('feedback').delete().eq('id', id);
    fetchAdminData();
  };


  // --------------- UI COMPONENTS ---------------

  const filteredSubjects = subjects.filter(subject =>
    subject.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <header className="navbar container">
        <div className="logo" onClick={() => { setActiveView('subjects'); window.scrollTo(0, 0); }} style={{ cursor: 'pointer' }}>
          <BookOpen size={28} />
          <span>NotesGrid</span>
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
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="btn btn-secondary"
            style={{ padding: '8px', borderRadius: '50%', width: '40px', height: '40px', justifyContent: 'center' }}
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setIsUploadModalOpen(true)} className="btn btn-text" style={{ fontSize: '0.875rem', gap: '4px' }}>
            <UploadCloud size={16} /> <span className="nav-btn-text">Upload</span>
          </button>
          <button onClick={() => setIsRequestModalOpen(true)} className="btn btn-text" style={{ fontSize: '0.875rem', gap: '4px' }}>
            <MessageSquare size={16} /> <span className="nav-btn-text">Request</span>
          </button>
          <button onClick={openAdminLogin} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', padding: '8px 16px' }}>
            <Shield size={16} /> <span className="nav-btn-text">Admin</span>
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
                      <div className="card-cover" style={{ background: '#fff', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                        <Document file={subject.pdf_url} loading={<div style={{ padding: '20px' }}>Loading Preview...</div>}>
                          <Page pageNumber={1} width={300} renderTextLayer={false} renderAnnotationLayer={false} />
                        </Document>
                        <div className="card-overlay">
                          <FileText size={32} color="white" />
                          <span style={{ color: 'white', marginTop: '8px', fontWeight: '500' }}>View Notes</span>
                        </div>
                      </div>
                      <div className="card-content">
                        <h3 className="card-title">{subject.title}</h3>
                        <div className="card-metadata">
                          {subject.author && <span className="card-author">by {subject.author}</span>}
                          <div className="card-tags">
                            {subject.student_class && <span className="card-tag">{subject.student_class}</span>}
                            {subject.subject && <span className="card-tag">{subject.subject}</span>}
                          </div>
                        </div>
                      </div>
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
                <div className="preview-header">
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Document Preview</h2>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Cloud-hosted PDF</span>
                </div>

                <div style={{
                  display: 'flex',
                  overflowX: 'auto',
                  gap: '24px',
                  paddingBottom: '20px',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'thin'
                }}>
                  <Document file={currentPdfUrl} loading="Loading Cloud PDF...">
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
              <div className="admin-header">
                <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>Admin Dashboard</h1>
                <button className="btn btn-secondary" onClick={() => setActiveView('subjects')}>Exit Admin</button>
              </div>

              <div className="admin-grid">

                {/* Upload Section */}
                <div className="admin-card">
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={20} /> Upload to Cloud</h2>
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
                      {isUploading ? 'Uploading to Cloud...' : 'Upload & Publish'}
                    </button>
                  </form>
                </div>

                {/* Manage Notes Section */}
                <div className="admin-card admin-card-scrollable">
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} /> Cloud Library</h2>
                  {subjects.length === 0 ? <p style={{ color: 'var(--text-tertiary)' }}>No notes uploaded yet.</p> : null}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {subjects.map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                        <span style={{ fontWeight: '500' }}>{s.title}</span>
                        <button onClick={() => handleDeleteNote(s)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Student Contributions Section */}
                <div className="admin-card admin-card-full">
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><UploadCloud size={20} /> Student Contributions</h2>
                  {studentContributions.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)' }}>No student contributions yet.</p>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Class</th>
                            <th>Subject</th>
                            <th>Material</th>
                            <th>Date</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentContributions.map((con, i) => (
                            <tr key={con.id}>
                              <td style={{ fontWeight: '500' }}>{con.name}</td>
                              <td>{con.student_class}</td>
                              <td>{con.subject}</td>
                              <td>
                                <a href={con.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <FileText size={14} /> View PDF
                                </a>
                              </td>
                              <td style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{new Date(con.created_at).toLocaleString()}</td>
                              <td>
                                <button onClick={() => handleDeleteContribution(con)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* User Requests Section */}
                <div className="admin-card admin-card-full">
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={20} /> User Requests</h2>
                  {userRequests.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)' }}>No requests yet.</p>
                  ) : (
                    <div className="admin-table-container">
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
                              <td style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{new Date(req.created_at).toLocaleString()}</td>
                              <td>
                                <button onClick={() => handleDeleteRequest(req.id)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Collected Emails Section */}
                <div className="admin-card admin-card-full">
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={20} /> Captured Leads</h2>
                  {capturedEmails.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)' }}>No emails captured yet.</p>
                  ) : (
                    <div className="admin-table-container">
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
                              <td style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{new Date(entry.created_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* User Feedback Section */}
                <div className="admin-card admin-card-full">
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={20} /> User Feedback</h2>
                  {userFeedback.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)' }}>No feedback received yet.</p>
                  ) : (
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>User Name</th>
                            <th>Suggestion</th>
                            <th>Date</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userFeedback.map((fb, i) => (
                            <tr key={fb.id}>
                              <td style={{ fontWeight: '500' }}>{fb.name}</td>
                              <td style={{ maxWidth: '400px' }}>{fb.suggestion}</td>
                              <td style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{new Date(fb.created_at).toLocaleString()}</td>
                              <td>
                                <button onClick={() => handleDeleteFeedback(fb.id)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
          <span>© 2026 NotesGrid</span>
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

      {/* User Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsUploadModalOpen(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="close-btn" onClick={() => setIsUploadModalOpen(false)}><X size={20} /></button>

              {!isUploadSuccess ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="modal-icon"><UploadCloud size={28} /></div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: '600' }}>Contribute Material</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Share your notes with others. Upload your PDF materials here.
                  </p>
                  <form onSubmit={handleUserUpload}>
                    <div className="input-group" style={{ textAlign: 'left', marginTop: 0 }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '500' }}>Full Name</label>
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name"
                        required
                      />
                    </div>
                    <div className="input-group" style={{ textAlign: 'left' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '500' }}>Class / Grade</label>
                      <input
                        type="text"
                        name="studentClass"
                        placeholder="e.g. 10th Standard, B.Tech CS"
                        required
                      />
                    </div>
                    <div className="input-group" style={{ textAlign: 'left' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '500' }}>Subject</label>
                      <input
                        type="text"
                        name="subject"
                        placeholder="e.g. Mathematics, Physics..."
                        required
                      />
                    </div>
                    <div className="input-group" style={{ textAlign: 'left' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '500' }}>PDF Material</label>
                      <input
                        type="file"
                        name="file"
                        accept=".pdf"
                        required
                        style={{ padding: '10px' }}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }} disabled={isUploading}>
                      {isUploading ? 'Uploading...' : 'Upload Material'}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="modal-icon" style={{ background: 'var(--accent-primary)', color: 'var(--card-bg)' }}><CheckCircle size={28} /></div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: '600' }}>Thank You!</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Your contribution has been received and will be reviewed shortly.
                  </p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isFeedbackModalOpen && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFeedbackModalOpen(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="close-btn" onClick={() => setIsFeedbackModalOpen(false)}><X size={20} /></button>

              {!isFeedbackSuccess ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="modal-icon"><MessageSquare size={28} /></div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: '600' }}>Your Feedback</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    We'd love to hear your suggestions to improve NotesGrid.
                  </p>
                  <form onSubmit={handleFeedbackSubmit}>
                    <div className="input-group" style={{ textAlign: 'left', marginTop: 0 }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '500' }}>Name</label>
                      <input
                        type="text"
                        name="name"
                        placeholder="Your Name"
                        required
                      />
                    </div>
                    <div className="input-group" style={{ textAlign: 'left' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '500' }}>Suggestions</label>
                      <textarea
                        name="suggestion"
                        placeholder="What can we do better?"
                        required
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          background: 'var(--input-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-primary)',
                          fontFamily: 'inherit',
                          fontSize: '1rem',
                          minHeight: '120px',
                          resize: 'vertical'
                        }}
                      ></textarea>
                    </div>
                    <button type="submit" className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                      Submit Feedback
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="modal-icon" style={{ background: 'var(--accent-primary)', color: 'var(--card-bg)' }}><CheckCircle size={28} /></div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', fontWeight: '600' }}>Feedback Sent</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
                    Thank you for helping us improve! We value your input.
                  </p>
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

      {/* Floating Feedback Button */}
      <motion.div
        className="floating-feedback-btn"
        onClick={() => setIsFeedbackModalOpen(true)}
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <MessageSquare size={24} />
        <span>Give Feedback</span>
      </motion.div>

    </>
  );
}

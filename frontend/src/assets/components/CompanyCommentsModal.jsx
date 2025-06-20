import { useState, useEffect } from 'react';
import defaultInstance from '../../api/defaultInstance';
import modalStyles from '../css/recordings-modal.module.css';
import { useLanguage } from '../i18n/LanguageContext';

const isSuperAdmin = localStorage.getItem('role') === 'super_admin';
const isAdmin = isSuperAdmin || localStorage.getItem('role') === 'admin';

const CompanyCommentsModal = ({ isOpen, onClose, companyId, companyName }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const { t } = useLanguage();

    useEffect(() => {
        if (isOpen && companyId) {
            // Clear any previous errors
            setErrorMessage('');
            fetchComments();
        }
    }, [isOpen, companyId]);

    const fetchComments = async () => {
        if (!companyId) {
            setErrorMessage('No company ID provided');
            return;
        }
        
        setIsLoading(true);
        try {
            console.log(`Fetching comments for company ID: ${companyId}`);
            const response = await defaultInstance.get(`/company-comments/${companyId}`);
            setComments(response.data);
        } catch (error) {
            console.error('Error fetching company comments:', error);
            let errorMsg = 'Failed to load comments';
            
            if (error.response?.data?.error) {
                errorMsg = error.response.data.error;
            } else if (error.message) {
                errorMsg = error.message;
            }
            
            setErrorMessage(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
            setNewComment('');
            setComments([]);
            setErrorMessage('');
            setReplyingTo(null);
            setReplyText('');
        }, 300);
    };

    const handleCommentChange = (e) => {
        setNewComment(e.target.value);
    };

    const handleReplyChange = (e) => {
        setReplyText(e.target.value);
    };

    const handleSubmitComment = async () => {
        if (!newComment.trim()) return;
        if (!companyId) {
            setErrorMessage('Company ID is missing');
            return;
        }
        
        setIsSaving(true);
        setErrorMessage('');
        
        try {
            console.log(`Saving comment for company ID: ${companyId}`);
            const response = await defaultInstance.post('/company-comments', {
                company_id: companyId,
                comment: newComment
            });
            
            setComments(prevComments => [response.data, ...prevComments]);
            setNewComment('');
        } catch (error) {
            console.error('Error saving comment:', error);
            let errorMsg = 'Failed to save comment';
            
            if (error.response?.data?.error) {
                errorMsg = error.response.data.error;
            } else if (error.message) {
                errorMsg = error.message;
            }
            
            setErrorMessage(errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleStartReply = (commentId) => {
        setReplyingTo(commentId);
        setReplyText('');
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
        setReplyText('');
    };

    const handleSubmitReply = async (parentId) => {
        if (!replyText.trim()) return;
        if (!companyId) {
            setErrorMessage('Company ID is missing');
            return;
        }
        
        setIsSaving(true);
        setErrorMessage('');
        
        try {
            const response = await defaultInstance.post('/company-comments', {
                company_id: companyId,
                comment: replyText,
                parent_id: parentId
            });
            
            // Update the comments state by adding the reply to the correct parent comment
            setComments(prevComments => prevComments.map(comment => 
                comment.id === parentId 
                    ? {
                        ...comment,
                        replies: [...(comment.replies || []), response.data]
                    }
                    : comment
            ));
            
            setReplyingTo(null);
            setReplyText('');
        } catch (error) {
            console.error('Error saving reply:', error);
            let errorMsg = 'Failed to save reply';
            
            if (error.response?.data?.error) {
                errorMsg = error.response.data.error;
            } else if (error.message) {
                errorMsg = error.message;
            }
            
            setErrorMessage(errorMsg);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteComment = (commentId) => {
        setCommentToDelete(commentId);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!commentToDelete) return;
        
        try {
            await defaultInstance.delete(`/company-comments/${commentToDelete}`);
            
            // Update comments state - handle both top-level comments and replies
            setComments(prevComments => {
                // First check if it's a top-level comment
                const isTopLevel = prevComments.some(c => c.id === commentToDelete);
                
                if (isTopLevel) {
                    return prevComments.filter(comment => comment.id !== commentToDelete);
                } else {
                    // It's a reply, so find the parent and filter out the reply
                    return prevComments.map(comment => {
                        if (comment.replies && comment.replies.some(r => r.id === commentToDelete)) {
                            return {
                                ...comment,
                                replies: comment.replies.filter(reply => reply.id !== commentToDelete)
                            };
                        }
                        return comment;
                    });
                }
            });
            
            setShowDeleteConfirm(false);
            setCommentToDelete(null);
        } catch (error) {
            console.error('Error deleting comment:', error);
            let errorMsg = 'Failed to delete comment';
            
            if (error.response?.data?.error) {
                errorMsg = error.response.data.error;
            } else if (error.message) {
                errorMsg = error.message;
            }
            
            setErrorMessage(errorMsg);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setCommentToDelete(null);
    };

    if (!isOpen) return null;

    return (
        <div className={`${modalStyles.modalOverlay} ${isClosing ? modalStyles.modalClosing : ''}`}>
            <div className={`${modalStyles.modalContent} ${isClosing ? modalStyles.modalContentClosing : ''}`}>
                <div className={modalStyles.modalHeader}>
                    <h5 className={modalStyles.modalTitle}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.414 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                            <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                        </svg>
                        {t('companyComments')} - {companyName}
                        <small className="ms-2 text-muted">(ID: {companyId})</small>
                    </h5>
                    <button type="button" className={modalStyles.closeButton} onClick={handleClose}>
                        ×
                    </button>
                </div>
                <div className={modalStyles.modalBody}>
                    {/* Error message display */}
                    {errorMessage && (
                        <div className={modalStyles.errorAlert}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                        </svg>
                        <span>{errorMessage}</span>
                    </div>
                    )}
                
                    {/* Comment input form */}
                    <div className={modalStyles.commentForm}>
                        <textarea
                            className={modalStyles.commentInput}
                            value={newComment}
                            onChange={handleCommentChange}
                            placeholder={t('addCommentForCompany')}
                            rows="3"
                        ></textarea>
                        <button 
                            className={modalStyles.commentButton}
                            onClick={handleSubmitComment}
                            disabled={isSaving || !newComment.trim()}
                        >
                            {isSaving ? t('saving') : t('addComment')}
                        </button>
                    </div>
                    
                    {/* Comments list */}
                    {isLoading ? (
                        <div className={modalStyles.loadingContainer}>
                            <div className={modalStyles.spinner}></div>
                            <p>{t('loadingComments')}</p>
                        </div>
                    ) : comments.length > 0 ? (
                        <>
                            <div className={modalStyles.commentsListHeader}>
                                {t('comments')} ({comments.length})
                            </div>
                            <div className={modalStyles.commentsList}>
                                {comments.map(comment => (
                                    <div key={comment.id} className={modalStyles.commentItem}>
                                        <p className={modalStyles.commentAuthor}>
                                            <span className={modalStyles.commentAuthorName}>
                                                {comment.user?.name || t('unknownUser')}
                                            </span>
                                            <span className={modalStyles.commentDate}>
                                                {new Date(comment.created_at).toLocaleString()}
                                            </span>
                                        </p>
                                        <p className={modalStyles.commentText}>{comment.comment}</p>
                                        
                                        <div className={modalStyles.commentActions}>
                                            {/* Reply button */}
                                            <button
                                                className={modalStyles.replyButton}
                                                onClick={() => handleStartReply(comment.id)}
                                                title={t('reply')}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M5.921 11.9 1.353 8.62a.719.719 0 0 1 0-1.238L5.921 4.1A.716.716 0 0 1 7 4.719v2.066h1a7 7 0 0 1 7 7v.5a.5.5 0 0 1-.5.5c-.123 0-.243-.015-.358-.043a5.517 5.517 0 0 0-3.185.172A1.5 1.5 0 0 0 10 16H8a.5.5 0 0 1-.5-.5v-2.326a.5.5 0 0 0-.5-.5H7v2.066a.716.716 0 0 1-1.079.619Z"/>
                                                </svg>
                                                {t('reply')}
                                            </button>
                                            
                                            {/* Delete button for super admins */}
                                            {isSuperAdmin && (
                                                <button
                                                    className={modalStyles.deleteCommentButton}
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    title={t('deleteComment')}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                    </svg>
                                                    {t('deleteComment')}
                                                </button>
                                            )}
                                        </div>
                                        
                                        {/* Reply form */}
                                        {replyingTo === comment.id && (
                                            <div className={modalStyles.replyForm}>
                                                <textarea
                                                    className={modalStyles.replyInput}
                                                    value={replyText}
                                                    onChange={handleReplyChange}
                                                    placeholder={t('typeYourReply')}
                                                    rows="2"
                                                ></textarea>
                                                <div className={modalStyles.replyFormButtons}>
                                                    <button 
                                                        className={modalStyles.cancelReplyButton}
                                                        onClick={handleCancelReply}
                                                    >
                                                        {t('cancel')}
                                                    </button>
                                                    <button 
                                                        className={modalStyles.submitReplyButton}
                                                        onClick={() => handleSubmitReply(comment.id)}
                                                        disabled={isSaving || !replyText.trim()}
                                                    >
                                                        {isSaving ? t('sending') : t('reply')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Display replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className={modalStyles.repliesList}>
                                                {comment.replies.map(reply => (
                                                    <div key={reply.id} className={modalStyles.replyItem}>
                                                        <p className={modalStyles.replyAuthor}>
                                                            <span className={modalStyles.replyAuthorName}>
                                                                {reply.user?.name || t('unknownUser')}
                                                            </span>
                                                            <span className={modalStyles.replyDate}>
                                                                {new Date(reply.created_at).toLocaleString()}
                                                            </span>
                                                        </p>
                                                        <p className={modalStyles.replyText}>{reply.comment}</p>
                                                        
                                                        {/* Delete button for replies - super admin only */}
                                                        {isSuperAdmin && (
                                                            <div className={modalStyles.replyActions}>
                                                                <button
                                                                    className={modalStyles.deleteReplyButton}
                                                                    onClick={() => handleDeleteComment(reply.id)}
                                                                    title={t('deleteReply')}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                                    </svg>
                                                                    {t('delete')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className={modalStyles.noComments}>{errorMessage ? '' : t('noCommentsYet')}</p>
                    )}
                </div>
            </div>
            
            {/* Delete confirmation modal */}
            {showDeleteConfirm && (
                <div className={modalStyles.deleteConfirmModal}>
                    <div className={modalStyles.deleteConfirmContent}>
                        <div className={modalStyles.deleteConfirmHeader}>
                            <h4>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                                </svg>
                                {t('deleteComment')}
                            </h4>
                        </div>
                        <div className={modalStyles.deleteConfirmBody}>
                            <p>{t('confirmCommentDeletion')}</p>
                        </div>
                        <div className={modalStyles.deleteConfirmFooter}>
                            <button 
                                className={modalStyles.cancelDeleteBtn}
                                onClick={cancelDelete}
                            >
                                {t('cancel')}
                            </button>
                            <button 
                                className={modalStyles.confirmDeleteBtn}
                                onClick={confirmDelete}
                            >
                                {t('delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyCommentsModal;

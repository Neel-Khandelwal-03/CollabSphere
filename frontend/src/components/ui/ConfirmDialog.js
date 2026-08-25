'use client';

import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  loading = false,
  danger = true,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={danger ? 'primary' : 'primary'}
          className={danger ? 'bg-danger hover:bg-danger/90' : ''}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

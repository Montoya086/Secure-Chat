import React, { Fragment, useEffect, useRef, useState } from 'react'
import useAuth from '../../hooks/useAuth';
import Modal from '@mui/material/Modal'
import './styles.css'
import { useDispatch } from 'react-redux';
import { setMfaCompleted } from '../../store/slices/appState-slice';

export interface MfaModalProps {
  isOpen: boolean;
}

const MfaModal: React.FC<MfaModalProps> = ({ isOpen }) => {
  const [step, setStep] = useState<number>(0);
  const [allowBack, setAllowBack] = useState<boolean>(true);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const otpRef = useRef<string>('');
  const { handleConfigureMfa, handleVerifyMfa } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    if (isOpen) {
      handleConfigureMfa((qrcode) => {
        if (qrcode) {
          setQrcode(qrcode);
        } else {
          setStep(1);
          setAllowBack(false);
        }
      });
    }
  }, [isOpen]);

  const handleBack = () => {
    if (allowBack) {
      setStep(0);
    }
  }

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      handleVerifyMfa(otpRef.current, (valid) => {
        if (valid) {
          dispatch(setMfaCompleted(true));
        }
      });
    }
  }

  return (
    <Modal open={isOpen}>
      <div className="modal-content">
        {step === 0 && (
          <Fragment>
            <div className="qrcode-container">
              <div className="qrcode-title">
                <p>Scan the QR code with your authenticator app</p>
              </div>
              {qrcode && (
                <img 
                  src={`data:image/png;base64,${qrcode}`} 
                  alt="QR Code para Google Authenticator" 
                  className="qrcode"
                />
              )}
              <div className="qrcode-buttons">
                <button onClick={handleNext}>Continue</button>
              </div>
            </div>
          </Fragment>
        )}
        {step === 1 && (
          <Fragment>
            <div className="otp-container">
              <p>Enter the code from your authenticator app</p>
              <input type="text" placeholder="Code" onChange={(e) => otpRef.current = e.target.value}/>
              <button onClick={handleNext}>Continue</button>
              {allowBack && (
                <div className="go-back" onClick={handleBack}>
                  Go back
                </div>
              )}
            </div>
          </Fragment>
        )}
      </div>
    </Modal>
  )
}

export default MfaModal
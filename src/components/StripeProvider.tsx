import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import axios from 'axios';

const StripeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  useEffect(() => {
    const getStripeKey = async () => {
      try {
        const response = await axios.get('/stripe/config');
        const stripe = loadStripe(response.data.publishable_key);
        setStripePromise(stripe);
      } catch (error) {
        console.error('Error loading Stripe:', error);
      }
    };

    getStripeKey();
  }, []);

  if (!stripePromise) {
    return <div>Loading payment system...</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};

export default StripeProvider;
import React from 'react';
import Header from '@/components/Header';
import MyTickets from '@/components/MyTickets';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const MyTicketsPage = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect admins to the admin support page
    if (isAdmin) {
      navigate('/support');
    }
  }, [isAdmin, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <MyTickets />
      </main>
    </div>
  );
};

export default MyTicketsPage;

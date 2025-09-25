import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProductCategories from "@/components/ProductCategories";
import WysiwygEditor from "@/components/WysiwygEditor";
import TicketForm from "@/components/TicketForm";
import ChatWidget from "@/components/ChatWidget";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <ProductCategories />
        <WysiwygEditor />
        <TicketForm />
      </main>
      <ChatWidget />
    </div>
  );
};

export default Index;

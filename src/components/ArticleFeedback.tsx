import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ArticleFeedbackProps {
  articleId: string;
  profileId: string;
}

const ArticleFeedback = ({ articleId, profileId }: ArticleFeedbackProps) => {
  const { toast } = useToast();
  const [userFeedback, setUserFeedback] = useState<boolean | null>(null);
  const [helpfulCount, setHelpfulCount] = useState(0);
  const [notHelpfulCount, setNotHelpfulCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, [articleId, profileId]);

  const fetchFeedback = async () => {
    try {
      // Get user's existing feedback
      const { data: existingFeedback } = await supabase
        .from('article_feedback')
        .select('is_helpful')
        .eq('article_id', articleId)
        .eq('profile_id', profileId)
        .maybeSingle();

      if (existingFeedback) {
        setUserFeedback(existingFeedback.is_helpful);
      }

      // Get total counts
      const { data: allFeedback } = await supabase
        .from('article_feedback')
        .select('is_helpful')
        .eq('article_id', articleId);

      if (allFeedback) {
        const helpful = allFeedback.filter(f => f.is_helpful).length;
        const notHelpful = allFeedback.filter(f => !f.is_helpful).length;
        setHelpfulCount(helpful);
        setNotHelpfulCount(notHelpful);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  const handleFeedback = async (isHelpful: boolean) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('article_feedback')
        .upsert({
          article_id: articleId,
          profile_id: profileId,
          is_helpful: isHelpful,
        }, {
          onConflict: 'article_id,profile_id'
        });

      if (error) throw error;

      setUserFeedback(isHelpful);
      
      // Update counts optimistically
      if (userFeedback === null) {
        // New feedback
        if (isHelpful) {
          setHelpfulCount(prev => prev + 1);
        } else {
          setNotHelpfulCount(prev => prev + 1);
        }
      } else if (userFeedback !== isHelpful) {
        // Changed feedback
        if (isHelpful) {
          setHelpfulCount(prev => prev + 1);
          setNotHelpfulCount(prev => prev - 1);
        } else {
          setHelpfulCount(prev => prev - 1);
          setNotHelpfulCount(prev => prev + 1);
        }
      }

      toast({
        title: "Thank you for your feedback!",
        description: "Your response helps us improve our documentation.",
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalVotes = helpfulCount + notHelpfulCount;
  const helpfulPercentage = totalVotes > 0 ? Math.round((helpfulCount / totalVotes) * 100) : 0;

  return (
    <div className="border-t border-border pt-8 mt-12">
      <div className="max-w-2xl mx-auto">
        <div className="bg-muted/30 rounded-lg p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Was this page helpful?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Let us know if you found this documentation useful
            </p>
            
            <div className="flex items-center justify-center gap-4">
              <Button
                variant={userFeedback === true ? "default" : "outline"}
                size="lg"
                onClick={() => handleFeedback(true)}
                disabled={loading}
                className="min-w-[120px]"
              >
                <ThumbsUp className="h-5 w-5 mr-2" />
                Yes
              </Button>
              <Button
                variant={userFeedback === false ? "default" : "outline"}
                size="lg"
                onClick={() => handleFeedback(false)}
                disabled={loading}
                className="min-w-[120px]"
              >
                <ThumbsDown className="h-5 w-5 mr-2" />
                No
              </Button>
            </div>
          </div>

          {totalVotes > 0 && (
            <div className="border-t border-border pt-4">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{helpfulPercentage}%</span>
                  <span>of {totalVotes} {totalVotes === 1 ? 'person' : 'people'} found this helpful</span>
                </div>
                
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3 text-green-500" />
                    <span>{helpfulCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsDown className="h-3 w-3 text-red-500" />
                    <span>{notHelpfulCount}</span>
                  </div>
                </div>
                
                {/* Visual progress bar */}
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${helpfulPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleFeedback;

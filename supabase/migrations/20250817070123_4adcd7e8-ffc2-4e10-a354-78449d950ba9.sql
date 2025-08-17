-- Add more sample articles with better variety and engagement data
INSERT INTO public.articles (title, description, content, url, source_name, category_id, topic_tags, engagement_score, is_featured, is_trending, created_at) VALUES
-- Politics
('Supreme Court Reviews Landmark Privacy Case', 'Constitutional experts weigh in on digital privacy rights as the Supreme Court hears arguments on government surveillance powers.', 'The Supreme Court today heard oral arguments in what many legal scholars are calling the most significant privacy case of the digital age...', 'https://example.com/supreme-court-privacy', 'Constitutional Daily', (SELECT id FROM categories WHERE slug = 'politics' LIMIT 1), ARRAY['supreme court', 'privacy', 'constitutional law', 'digital rights'], 245, true, false, NOW() - INTERVAL '2 hours'),

('Congressional Budget Battle Intensifies', 'Lawmakers face midnight deadline as spending negotiations continue with no clear resolution in sight.', 'With just hours remaining before a potential government shutdown, congressional leaders from both parties...', 'https://example.com/budget-battle', 'Capitol Report', (SELECT id FROM categories WHERE slug = 'politics' LIMIT 1), ARRAY['congress', 'budget', 'government shutdown', 'negotiations'], 189, false, true, NOW() - INTERVAL '4 hours'),

('International Trade Summit Begins', 'World leaders gather to discuss post-pandemic economic recovery and trade relationship restructuring.', 'The annual Global Trade Summit kicked off today with representatives from over 50 nations...', 'https://example.com/trade-summit', 'Global Economics', (SELECT id FROM categories WHERE slug = 'politics' LIMIT 1), ARRAY['trade', 'international relations', 'economics', 'diplomacy'], 156, false, false, NOW() - INTERVAL '6 hours'),

-- Technology
('AI Breakthrough in Medical Diagnosis', 'New artificial intelligence system shows 98% accuracy in early cancer detection, potentially revolutionizing healthcare screening.', 'Researchers at leading medical institutions have developed an AI system that can detect early-stage cancers...', 'https://example.com/ai-medical-breakthrough', 'TechMed Today', (SELECT id FROM categories WHERE slug = 'technology' LIMIT 1), ARRAY['artificial intelligence', 'healthcare', 'medical diagnosis', 'cancer detection'], 567, true, true, NOW() - INTERVAL '1 hour'),

('Quantum Computing Milestone Achieved', 'Scientists demonstrate quantum advantage in complex optimization problems, marking significant progress toward practical applications.', 'A team of quantum computing researchers has achieved a major milestone by demonstrating clear quantum advantage...', 'https://example.com/quantum-computing', 'Quantum Tech Weekly', (SELECT id FROM categories WHERE slug = 'technology' LIMIT 1), ARRAY['quantum computing', 'research', 'optimization', 'breakthrough'], 423, true, false, NOW() - INTERVAL '3 hours'),

('Cybersecurity Alert: New Ransomware Threat', 'Security experts warn of sophisticated new ransomware targeting critical infrastructure and healthcare systems.', 'Cybersecurity firms have identified a new strain of ransomware that specifically targets...', 'https://example.com/ransomware-alert', 'CyberSec News', (SELECT id FROM categories WHERE slug = 'technology' LIMIT 1), ARRAY['cybersecurity', 'ransomware', 'infrastructure', 'healthcare'], 234, false, true, NOW() - INTERVAL '5 hours'),

('Electric Vehicle Market Surges', 'Global EV sales reach record highs as major automakers announce new battery technology breakthroughs.', 'The electric vehicle market continues its unprecedented growth with sales figures...', 'https://example.com/ev-market-surge', 'Auto Innovation', (SELECT id FROM categories WHERE slug = 'technology' LIMIT 1), ARRAY['electric vehicles', 'automotive', 'battery technology', 'sustainability'], 345, false, false, NOW() - INTERVAL '8 hours'),

-- Sports
('World Cup Semifinal Shocker', 'Underdog team defeats tournament favorites in penalty shootout thriller, advancing to championship match.', 'In one of the most dramatic matches in World Cup history, the underdog squad from...', 'https://example.com/world-cup-semifinal', 'Sports Central', (SELECT id FROM categories WHERE slug = 'sports' LIMIT 1), ARRAY['world cup', 'soccer', 'championship', 'upset'], 789, true, true, NOW() - INTERVAL '30 minutes'),

('Olympic Records Fall at Swimming Championships', 'Three world records broken in single day as swimmers prepare for upcoming Olympic Games.', 'The World Swimming Championships witnessed history as three long-standing world records...', 'https://example.com/swimming-records', 'Aquatic Sports', (SELECT id FROM categories WHERE slug = 'sports' LIMIT 1), ARRAY['swimming', 'olympics', 'world records', 'championships'], 445, false, true, NOW() - INTERVAL '2 hours'),

('Basketball Draft Analysis', 'Experts break down the biggest surprises and steals from this year''s professional basketball draft.', 'The annual professional basketball draft concluded with several surprising picks and potential future stars...', 'https://example.com/basketball-draft', 'Hoops Weekly', (SELECT id FROM categories WHERE slug = 'sports' LIMIT 1), ARRAY['basketball', 'draft', 'prospects', 'analysis'], 267, false, false, NOW() - INTERVAL '4 hours'),

-- Entertainment
('Streaming Wars Heat Up', 'Major platforms announce exclusive content deals and pricing changes as competition for subscribers intensifies.', 'The battle for streaming supremacy entered a new phase today as several major platforms...', 'https://example.com/streaming-wars', 'Entertainment Tonight', (SELECT id FROM categories WHERE slug = 'entertainment' LIMIT 1), ARRAY['streaming', 'entertainment', 'content', 'subscription'], 356, false, true, NOW() - INTERVAL '1 hour'),

('Awards Season Predictions', 'Industry insiders share their predictions for this year''s major entertainment awards following festival circuit screenings.', 'As award season approaches, critics and industry veterans are weighing in on the potential contenders...', 'https://example.com/awards-predictions', 'Hollywood Reporter', (SELECT id FROM categories WHERE slug = 'entertainment' LIMIT 1), ARRAY['awards', 'movies', 'television', 'predictions'], 234, false, false, NOW() - INTERVAL '3 hours'),

('Music Festival Innovation', 'Virtual reality technology transforms live music experience as festivals embrace immersive technologies.', 'The annual music festival scene is undergoing a technological revolution with the introduction...', 'https://example.com/music-festival-vr', 'Music Tech', (SELECT id FROM categories WHERE slug = 'entertainment' LIMIT 1), ARRAY['music', 'virtual reality', 'festivals', 'technology'], 178, false, false, NOW() - INTERVAL '5 hours'),

-- Business
('Market Volatility Continues', 'Global markets experience turbulence as investors react to latest economic indicators and policy announcements.', 'Financial markets around the world experienced significant volatility today as investors...', 'https://example.com/market-volatility', 'Financial Times', (SELECT id FROM categories WHERE slug = 'business' LIMIT 1), ARRAY['markets', 'volatility', 'investing', 'economics'], 445, false, true, NOW() - INTERVAL '1 hour'),

('Startup Funding Milestone', 'Record-breaking venture capital investment quarter signals continued confidence in innovation sectors.', 'Venture capital firms deployed a record $45 billion in the third quarter, surpassing...', 'https://example.com/startup-funding', 'Venture Beat', (SELECT id FROM categories WHERE slug = 'business' LIMIT 1), ARRAY['startups', 'venture capital', 'funding', 'innovation'], 223, false, false, NOW() - INTERVAL '4 hours'),

('Corporate Sustainability Push', 'Major corporations announce ambitious carbon neutrality goals as ESG investing gains momentum.', 'A coalition of Fortune 500 companies today announced coordinated efforts to achieve carbon neutrality...', 'https://example.com/corporate-sustainability', 'Green Business', (SELECT id FROM categories WHERE slug = 'business' LIMIT 1), ARRAY['sustainability', 'carbon neutral', 'ESG', 'corporate responsibility'], 189, true, false, NOW() - INTERVAL '6 hours'),

-- Health
('Mental Health Awareness Campaign Launches', 'National initiative aims to reduce stigma and improve access to mental health resources across communities.', 'A comprehensive national mental health awareness campaign was launched today with the goal...', 'https://example.com/mental-health-campaign', 'Health Today', (SELECT id FROM categories WHERE slug = 'health' LIMIT 1), ARRAY['mental health', 'awareness', 'community health', 'healthcare access'], 334, true, false, NOW() - INTERVAL '2 hours'),

('Breakthrough in Alzheimer''s Research', 'New clinical trial results show promising therapeutic approach for early-stage Alzheimer''s treatment.', 'Researchers have announced encouraging results from a Phase III clinical trial testing...', 'https://example.com/alzheimers-breakthrough', 'Medical Research Weekly', (SELECT id FROM categories WHERE slug = 'health' LIMIT 1), ARRAY['alzheimers', 'clinical trials', 'neurology', 'treatment'], 445, true, true, NOW() - INTERVAL '3 hours'),

('Nutrition Guidelines Updated', 'Health authorities release updated dietary recommendations based on latest nutritional science research.', 'The latest dietary guidelines reflect new understanding of nutrition science and include...', 'https://example.com/nutrition-guidelines', 'Nutrition Science', (SELECT id FROM categories WHERE slug = 'health' LIMIT 1), ARRAY['nutrition', 'diet', 'health guidelines', 'research'], 156, false, false, NOW() - INTERVAL '7 hours'),

-- Science
('Mars Mission Update', 'Latest data from Mars rover reveals evidence of ancient water systems and potential signs of past microbial life.', 'The ongoing Mars exploration mission has yielded exciting new discoveries about the Red Planet''s...', 'https://example.com/mars-mission', 'Space Exploration', (SELECT id FROM categories WHERE slug = 'science' LIMIT 1), ARRAY['mars', 'space exploration', 'astrobiology', 'nasa'], 567, true, true, NOW() - INTERVAL '1 hour'),

('Climate Change Research', 'New climate models show accelerated warming trends, prompting calls for immediate action on emissions reduction.', 'Climate scientists have released updated models that show global warming occurring at a faster pace...', 'https://example.com/climate-research', 'Climate Science Today', (SELECT id FROM categories WHERE slug = 'science' LIMIT 1), ARRAY['climate change', 'global warming', 'environmental science', 'research'], 389, true, false, NOW() - INTERVAL '4 hours'),

('Ocean Discovery', 'Deep-sea expedition uncovers new species and ecosystems in previously unexplored ocean trenches.', 'A groundbreaking deep-sea expedition has discovered dozens of new species living in...', 'https://example.com/ocean-discovery', 'Marine Biology Journal', (SELECT id FROM categories WHERE slug = 'science' LIMIT 1), ARRAY['marine biology', 'deep sea', 'biodiversity', 'exploration'], 234, false, false, NOW() - INTERVAL '8 hours'),

-- World News
('International Climate Summit', 'World leaders convene for emergency climate summit as extreme weather events continue to impact global communities.', 'Representatives from nearly 200 countries have gathered for an emergency climate summit...', 'https://example.com/climate-summit', 'Global News Network', (SELECT id FROM categories WHERE slug = 'world' LIMIT 1), ARRAY['climate summit', 'international relations', 'environment', 'policy'], 445, true, true, NOW() - INTERVAL '2 hours'),

('Humanitarian Crisis Response', 'International aid organizations coordinate massive relief effort following natural disaster in Southeast Asia.', 'A coordinated international humanitarian response is underway following the devastating...', 'https://example.com/humanitarian-crisis', 'World Aid Today', (SELECT id FROM categories WHERE slug = 'world' LIMIT 1), ARRAY['humanitarian aid', 'natural disaster', 'international cooperation', 'relief efforts'], 278, false, false, NOW() - INTERVAL '5 hours'),

('Cultural Heritage Protection', 'UNESCO announces new initiative to protect endangered cultural sites and artifacts from climate change impacts.', 'The United Nations Educational, Scientific and Cultural Organization has launched...', 'https://example.com/cultural-heritage', 'Cultural Preservation', (SELECT id FROM categories WHERE slug = 'world' LIMIT 1), ARRAY['unesco', 'cultural heritage', 'preservation', 'climate impact'], 167, false, false, NOW() - INTERVAL '9 hours');

-- Update existing articles to have better engagement scores and tags
UPDATE public.articles 
SET 
  engagement_score = CASE 
    WHEN engagement_score = 0 THEN FLOOR(RANDOM() * 300 + 50)
    ELSE engagement_score 
  END,
  topic_tags = CASE 
    WHEN topic_tags = '{}' THEN 
      CASE category_id
        WHEN (SELECT id FROM categories WHERE slug = 'politics' LIMIT 1) THEN ARRAY['politics', 'government', 'policy']
        WHEN (SELECT id FROM categories WHERE slug = 'technology' LIMIT 1) THEN ARRAY['technology', 'innovation', 'digital']
        WHEN (SELECT id FROM categories WHERE slug = 'sports' LIMIT 1) THEN ARRAY['sports', 'competition', 'athletics']
        WHEN (SELECT id FROM categories WHERE slug = 'entertainment' LIMIT 1) THEN ARRAY['entertainment', 'media', 'culture']
        WHEN (SELECT id FROM categories WHERE slug = 'business' LIMIT 1) THEN ARRAY['business', 'economy', 'finance']
        WHEN (SELECT id FROM categories WHERE slug = 'health' LIMIT 1) THEN ARRAY['health', 'medicine', 'wellness']
        WHEN (SELECT id FROM categories WHERE slug = 'science' LIMIT 1) THEN ARRAY['science', 'research', 'discovery']
        WHEN (SELECT id FROM categories WHERE slug = 'world' LIMIT 1) THEN ARRAY['world news', 'international', 'global']
        ELSE ARRAY['news', 'current events']
      END
    ELSE topic_tags 
  END,
  is_trending = CASE 
    WHEN RANDOM() > 0.8 AND engagement_score > 200 THEN true 
    ELSE is_trending 
  END,
  is_featured = CASE 
    WHEN RANDOM() > 0.9 AND engagement_score > 300 THEN true 
    ELSE is_featured 
  END
WHERE created_at < NOW() - INTERVAL '1 day';
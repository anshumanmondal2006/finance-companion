import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Users, Target, Heart, Gamepad2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import GamesSection from '@/components/dashboard/GamesSection';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Resource {
  id: string;
  title: string;
  creator: string;
  description: string;
  link: string;
  type: 'video' | 'doc';
}

interface AgeGroup {
  id: string;
  name: string;
  ageRange: string;
  theme: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  resources: Resource[];
}

const ageGroups: AgeGroup[] = [
  {
    id: 'fresh-graduates',
    name: 'Fresh Graduates & Young Professionals',
    ageRange: 'Age 18–30',
    theme: 'Building discipline, starting early, compounding, and basics of the stock market.',
    icon: <Users className="w-6 h-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    resources: [
      {
        id: 'fg-1',
        title: 'The Power of Compounding Explained',
        creator: 'Pranjal Kamra',
        description: 'Understand how compounding works and why starting early matters for wealth creation.',
        link: 'https://www.youtube.com/results?search_query=pranjal+kamra+power+of+compounding',
        type: 'video'
      },
      {
        id: 'fg-2',
        title: 'How to Manage Your First Salary & The 50-30-20 Rule',
        creator: 'Ankur Warikoo',
        description: 'Learn the fundamental budgeting rule to manage your first salary effectively.',
        link: 'https://www.youtube.com/results?search_query=ankur+warikoo+first+salary+budgeting',
        type: 'video'
      },
      {
        id: 'fg-3',
        title: 'Basics of Stock Market for Beginners',
        creator: 'CA Rachana Phadke Ranade',
        description: 'A complete beginner\'s guide to understanding the stock market fundamentals.',
        link: 'https://www.youtube.com/results?search_query=basics+of+stock+market+ca+rachana+ranade',
        type: 'video'
      },
      {
        id: 'fg-4',
        title: 'What are Mutual Funds? A Complete Beginner\'s Guide',
        creator: 'ET Money',
        description: 'Comprehensive introduction to mutual funds and how they work.',
        link: 'https://www.youtube.com/results?search_query=et+money+what+are+mutual+funds',
        type: 'video'
      },
      {
        id: 'fg-5',
        title: 'Why You Need an Emergency Fund Immediately',
        creator: 'Labour Law Advisor',
        description: 'Understand the importance of having an emergency fund right from the start.',
        link: 'https://www.youtube.com/results?search_query=labour+law+advisor+emergency+fund',
        type: 'video'
      },
      {
        id: 'fg-6',
        title: 'Health Insurance vs Term Insurance: What to buy first?',
        creator: 'Asset Yogi',
        description: 'Learn which insurance product should be your priority as a young professional.',
        link: 'https://www.youtube.com/results?search_query=asset+yogi+health+vs+term+insurance',
        type: 'video'
      },
      {
        id: 'fg-7',
        title: 'What is Nifty 50 and Sensex?',
        creator: 'Groww',
        description: 'Understand India\'s major stock market indices and what they represent.',
        link: 'https://www.youtube.com/results?search_query=groww+what+is+nifty+and+sensex',
        type: 'video'
      },
      {
        id: 'fg-8',
        title: 'Credit Cards: How to use them without falling into a debt trap',
        creator: 'Finology Legal',
        description: 'Master credit card usage and avoid common debt traps.',
        link: 'https://www.youtube.com/results?search_query=finology+legal+credit+card+trap',
        type: 'video'
      },
      {
        id: 'fg-9',
        title: 'Active vs Passive Investing (Index Funds)',
        creator: 'Pranjal Kamra',
        description: 'Compare active and passive investing strategies and learn about index funds.',
        link: 'https://www.youtube.com/results?search_query=pranjal+kamra+index+funds',
        type: 'video'
      },
      {
        id: 'fg-doc-1',
        title: 'Financial Education',
        creator: 'SEBI',
        description: 'An official guide covering financial planning, compounding, and setting SMART goals.',
        link: 'https://investor.sebi.gov.in/pdf/reference-material/collegestudents.pdf',
        type: 'doc',
      },
      {
        id: 'fg-doc-2',
        title: 'The Financial Literacy Handbook',
        creator: 'RBI',
        description: 'A comprehensive manual explaining banking basics, digital safety, and credit discipline.',
        link: 'https://www.rbi.org.in/commonman/English/scripts/financialliteracyguide.aspx',
        type: 'doc',
      },
      // {
      //   id: 'fg-doc-3',
      //   title: 'Introduction to Securities Markets',
      //   creator: 'NISM',
      //   description: 'A foundational workbook explaining how stock exchanges, indices, and shares work.',
      //   link: 'https://www.nism.ac.in/certification/index.php/nism-certifications/securities-markets-foundation',
      //   type: 'doc',
      // },
    ],
  },
  {
    id: 'middle-age',
    name: 'Middle-Aged Group',
    ageRange: 'Age 30–50',
    theme: 'Wealth creation, debt management (home loans), tax planning, and family security.',
    icon: <Target className="w-6 h-6" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    resources: [
      {
        id: 'ma-1',
        title: 'Home Loan Prepayment Strategy: Invest or Pay off?',
        creator: 'Labour Law Advisor',
        description: 'Strategic decision-making for home loan prepayment vs investment.',
        link: 'https://www.youtube.com/results?search_query=labour+law+advisor+home+loan+prepayment',
        type: 'video'
      },
      {
        id: 'ma-2',
        title: 'Real Estate vs Mutual Funds: Where to Invest?',
        creator: 'Asset Yogi',
        description: 'Comprehensive comparison of real estate and mutual fund investments.',
        link: 'https://www.youtube.com/results?search_query=asset+yogi+real+estate+vs+mutual+funds',
        type: 'video'
      },
      {
        id: 'ma-3',
        title: 'Asset Allocation: Balancing Risk and Reward',
        creator: 'Freefincal',
        description: 'Learn how to properly allocate assets based on your risk profile.',
        link: 'https://www.youtube.com/results?search_query=freefincal+asset+allocation',
        type: 'video'
      },
      {
        id: 'ma-4',
        title: 'Planning for Children\'s Higher Education and Inflation',
        creator: 'Pranjal Kamra',
        description: 'Strategic planning for your child\'s education with inflation considerations.',
        link: 'https://www.youtube.com/results?search_query=pranjal+kamra+child+education+planning',
        type: 'video'
      },
      {
        id: 'ma-5',
        title: 'Complete Tax Planning Guide (Section 80C and beyond)',
        creator: 'CA Rachana Phadke Ranade',
        description: 'Comprehensive tax planning strategies to minimize your tax burden.',
        link: 'https://www.youtube.com/results?search_query=ca+rachana+ranade+tax+planning',
        type: 'video'
      },
      {
        id: 'ma-6',
        title: 'How to Choose the Best Family Floater Health Insurance',
        creator: 'Labour Law Advisor',
        description: 'Guide to selecting the right family health insurance plan.',
        link: 'https://www.youtube.com/results?search_query=labour+law+advisor+family+health+insurance',
        type: 'video'
      },
      {
        id: 'ma-7',
        title: 'Debt Mutual Funds Explained',
        creator: 'ET Money',
        description: 'Understand debt mutual funds and their role in a balanced portfolio.',
        link: 'https://www.youtube.com/results?search_query=et+money+debt+mutual+funds',
        type: 'video'
      },
      {
        id: 'ma-8',
        title: 'PPF vs EPF vs VPF: Which is better?',
        creator: 'Groww',
        description: 'Compare different savings schemes to find the best fit for your goals.',
        link: 'https://www.youtube.com/results?search_query=groww+ppf+vs+epf',
        type: 'video'
      },
      {
        id: 'ma-9',
        title: 'How to protect your wealth from Inflation',
        creator: 'Ankur Warikoo',
        description: 'Strategies to safeguard your accumulated wealth against inflation.',
        link: 'https://www.youtube.com/results?search_query=ankur+warikoo+inflation',
        type: 'video'
      },
      {
        id: 'ma-doc-1',
        title: 'NPS All Citizen Model Brochure',
        creator: 'PFRDA',
        description: 'A detailed guide to the National Pension System for long-term wealth and tax savings.',
        link: 'https://pfrda.org.in/financial-literacy/trainings',
        type: 'doc',
      },
      {
        id: 'ma-doc-2',
        title: 'Consumer Handbook on Health Insurance',
        creator: 'IRDAI',
        description: 'Clarifies insurance terms and explains Family Floater plans to avoid pitfalls.',
        link: 'https://irdai.gov.in/handbooks',
        type: 'doc',
      },
      {
        id: 'ma-doc-3',
        title: 'Taxpayers’ Learning Tutorials',
        creator: 'Income Tax Dept',
        description: 'Official documentation explaining various deductions (80C, 80D) and tax obligations.',
        link: 'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1',
        type: 'doc',
      },
    ],
  },
  {
    id: 'elderly',
    name: 'Elderly & Nearing Retirement',
    ageRange: 'Age 50+',
    theme: 'Capital preservation, generating regular income, estate planning, and safe instruments.',
    icon: <Heart className="w-6 h-6" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    resources: [
      {
        id: 'el-1',
        title: 'Systematic Withdrawal Plan (SWP) for Regular Monthly Income',
        creator: 'ET Money',
        description: 'Learn how to generate regular monthly income from your investments.',
        link: 'https://www.youtube.com/results?search_query=et+money+swp+systematic+withdrawal+plan',
        type: 'video'
      },
      {
        id: 'el-2',
        title: 'Senior Citizen Savings Scheme (SCSS) Complete Details',
        creator: 'Groww',
        description: 'Comprehensive overview of SCSS benefits and eligibility.',
        link: 'https://www.youtube.com/results?search_query=groww+senior+citizen+savings+scheme',
        type: 'video'
      },
      {
        id: 'el-3',
        title: 'How to Write a Will and Estate Planning Basics',
        creator: 'Asset Yogi',
        description: 'Essential guide to estate planning and will preparation.',
        link: 'https://www.youtube.com/results?search_query=asset+yogi+how+to+write+a+will',
        type: 'video'
      },
      {
        id: 'el-4',
        title: 'Post Office Monthly Income Scheme (POMIS)',
        creator: 'Labour Law Advisor',
        description: 'Understanding POMIS as a safe income-generating option.',
        link: 'https://www.youtube.com/results?search_query=labour+law+advisor+pomis',
        type: 'video'
      },
      {
        id: 'el-5',
        title: 'Fixed Deposits vs Debt Funds for Retirees',
        creator: 'CA Rachana Phadke Ranade',
        description: 'Comparing safe investment options for retirement corpus.',
        link: 'https://www.youtube.com/results?search_query=ca+rachana+ranade+fd+vs+debt+funds',
        type: 'video'
      },
      {
        id: 'el-6',
        title: 'Health Insurance for Senior Citizens: What to check?',
        creator: 'Ditto Insurance / LLA',
        description: 'Important factors to consider when selecting health insurance as a senior.',
        link: 'https://www.youtube.com/results?search_query=ditto+insurance+senior+citizen+health+insurance',
        type: 'video'
      },
      {
        id: 'el-7',
        title: 'Safe Investment Options for Retirement Corpus',
        creator: 'Value Research',
        description: 'Explore safe and reliable investment options for retirement.',
        link: 'https://www.youtube.com/results?search_query=value+research+retirement+investments',
        type: 'video'
      },
      {
        id: 'el-8',
        title: 'Reverse Mortgage Explained: Income from your House',
        creator: 'Asset Yogi',
        description: 'Understand reverse mortgage as an income option for retirees.',
        link: 'https://www.youtube.com/results?search_query=asset+yogi+reverse+mortgage',
        type: 'video'
      },
      {
        id: 'el-9',
        title: 'How to calculate exactly how much you need for retirement',
        creator: 'Freefincal',
        description: 'Calculate your retirement corpus requirement accurately.',
        link: 'https://www.youtube.com/results?search_query=freefincal+retirement+calculator',
        type: 'video'
      },
      {
        id: 'el-doc-1',
        title: 'Senior Citizen Savings Scheme Rules',
        creator: 'National Savings Institute',
        description: 'Definitive government document outlining interest rates, limits, and extension rules.',
        link: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=62',
        type: 'doc',
      },
      {
        id: 'el-doc-4',
        title: 'Investor Awareness Handbooks',
        creator: 'IEPF Authority',
        description: 'Official government handbooks on protecting your investments, understanding your rights, and claiming unclaimed dividends or shares.',
        link: 'https://www.iepf.gov.in/content/iepf/global/master/Home/InvestorAwareness/resources/iec-material/handbooks.html',
        type: 'doc',
      },
      
    ],
  },
];

export default function FinanceEducation() {
  const { ageGroup, onboardingData } = useStore();
  const [isGamesOpen, setIsGamesOpen] = useState(false);
  const [allGamesMastered, setAllGamesMastered] = useState(false);

  // Get age group for games
  const getGameAgeGroup = (): 'fresh-graduate' | 'middle-age' | 'elderly' => {
    if (onboardingData?.profile?.dob) {
      const dob = new Date(onboardingData.profile.dob);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      if (age < 25) return 'fresh-graduate';
      if (age <= 60) return 'middle-age';
      return 'elderly';
    }
    return 'fresh-graduate';
  };

  const gameAgeGroup = getGameAgeGroup();
  const user = useStore((state) => state.user);
  const userId = user?.id;

  // Clear localStorage when user changes (logout and login as different user)
  useEffect(() => {
    if (!userId) {
      // User logged out, clear ALL game mastered keys from ANY user
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('games_mastered_')) {
          localStorage.removeItem(key);
          console.log(`🔓 Cleared: ${key}`);
        }
      });
      setAllGamesMastered(false);
      console.log(`🔓 All game mastery localStorage cleared for logged-out user`);
    }
  }, [userId]);

  // Load and persist mastered status for this age group (localStorage for instant UI, MongoDB for persistence)
  useEffect(() => {
    if (!userId) return; // Don't load if no user is logged in
    
    const storageKey = `games_mastered_${gameAgeGroup}_${userId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved === 'true') {
      setAllGamesMastered(true);
      console.log(`📍 Loaded mastered status for ${gameAgeGroup} from localStorage: true`);
    } else {
      setAllGamesMastered(false);
    }
  }, [gameAgeGroup, userId]);

  const handleAllMastered = () => {
    setAllGamesMastered(true);
    // Save to localStorage for instant UI update (user-specific key)
    if (userId) {
      const storageKey = `games_mastered_${gameAgeGroup}_${userId}`;
      localStorage.setItem(storageKey, 'true');
      console.log(`✅ Saved mastered status for ${gameAgeGroup} to localStorage & MongoDB for user ${userId}`);
    }
    // Close dialog after a short delay so user sees the message
    setTimeout(() => setIsGamesOpen(false), 2000);
  };

  // Get the current user's age group content
  const getUserAgeGroupContent = () => {
    return ageGroups.find(group => {
      const mapId = gameAgeGroup === 'fresh-graduate' ? 'fresh-graduates' : gameAgeGroup;
      return group.id === mapId;
    });
  };

  const userGroupContent = getUserAgeGroupContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 mb-3">Finance Education Hub</h1>
              <p className="text-xl text-slate-600 mb-6">
                Curated learning materials tailored to your financial stage in life
              </p>
            </div>
            {/* Test Your Knowledge Button - Top Right Corner */}
            {!allGamesMastered ? (
              <button
                onClick={() => setIsGamesOpen(true)}
                className="group relative flex-shrink-0 mt-2"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative px-6 py-3 bg-white rounded-full flex items-center gap-2 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                  <Gamepad2 className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-600 hidden sm:inline">Test Knowledge</span>
                </div>
              </button>
            ) : (
              <button
                disabled
                className="group relative flex-shrink-0 mt-2 opacity-50 cursor-not-allowed"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-400 to-gray-400 rounded-full blur opacity-50"></div>
                <div className="relative px-6 py-3 bg-gray-100 rounded-full flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-gray-400" />
                  <span className="font-semibold text-gray-400 hidden sm:inline">All Mastered ✓</span>
                </div>
              </button>
            )}
          </div>

          {/* Tab Navigation - REMOVED: Now showing only user's age group content */}
          {userGroupContent && (
            <div className="space-y-6">
              {/* Age Group Header */}
              <div
                className={`${userGroupContent.bgColor} rounded-lg p-8 mb-6 border-l-4 ${
                  userGroupContent.id === 'fresh-graduates'
                    ? 'border-blue-600'
                    : userGroupContent.id === 'middle-age'
                    ? 'border-green-600'
                    : 'border-orange-600'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`${userGroupContent.color} flex-shrink-0 mt-1`}>{userGroupContent.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h2 className={`text-2xl font-bold ${userGroupContent.color}`}>{userGroupContent.name}</h2>
                      <Badge variant="outline" className="whitespace-nowrap">
                        {userGroupContent.ageRange}
                      </Badge>
                      <Badge className="bg-blue-600 text-white whitespace-nowrap">
                        Your Group
                      </Badge>
                    </div>
                    <p className="text-slate-700">{userGroupContent.theme}</p>
                  </div>
                </div>
              </div>

              {/* Resources Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userGroupContent.resources.map((resource) => (
                  <Card key={resource.id} className="h-full flex flex-col hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg leading-tight">{resource.title}</CardTitle>
                          <Badge variant={resource.type === 'doc' ? 'default' : 'secondary'} className="ml-2">
                            {resource.type === 'video' ? 'Video' : 'Official'}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm font-medium text-slate-600">
                          by {resource.creator}
                        </CardDescription>
                      </CardHeader>
                    <CardContent className="flex-1 pb-4">
                      <p className="text-slate-600 text-sm mb-4">{resource.description}</p>
                      <Button asChild className="w-full mt-auto">
                        <a
                          href={resource.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2"
                        >
                          {resource.type === 'doc' ? 'Read Document' : 'Watch Video'}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-3">Ready to Learn More?</h3>
          <p className="text-lg mb-2 opacity-90">
            Master your finances with our curated resources and interactive games
          </p>
          <p className="text-sm opacity-75">
            💡 Click the "Test Knowledge" button in the top corner to challenge yourself with age-specific financial games
          </p>
        </div>
      </div>

      {/* Games Modal Dialog */}
      <Dialog open={isGamesOpen} onOpenChange={setIsGamesOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Your Knowledge</DialogTitle>
            <DialogDescription>
              Challenge yourself with our interactive games designed for your financial stage
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <GamesSection 
              ageGroup={gameAgeGroup}
              title={gameAgeGroup === 'fresh-graduate' ? '🎓 Financial Learning Games' : gameAgeGroup === 'middle-age' ? '📈 Wealth Building Games' : '👴 Retirement Planning Games'}
              onAllMastered={handleAllMastered}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
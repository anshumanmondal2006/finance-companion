import mongoose from 'mongoose';
import Game from '../models/Game.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const games = [
  // Fresh Graduate Games
  {
    title: 'Budget Challenge',
    description: 'Test your budgeting skills by managing expenses',
    ageGroup: 'fresh-graduate',
    category: 'budget',
    icon: '💰',
    difficulty: 'easy',
    estimatedTime: 10,
    instructions: 'Answer these questions about smart budgeting practices.',
    questions: [
      {
        question: 'What percentage of income should ideally go to savings?',
        options: ['5-10%', '10-20%', '30-50%', '50%+'],
        correctAnswer: 1,
        explanation: 'Experts recommend saving 10-20% of your income for long-term financial health.',
      },
      {
        question: 'What is the 50/30/20 rule?',
        options: [
          'Invest 50%, save 30%, spend 20%',
          '50% needs, 30% wants, 20% savings',
          '50% bills, 30% food, 20% entertainment',
          'None of the above',
        ],
        correctAnswer: 1,
        explanation: 'The 50/30/20 rule allocates 50% to needs, 30% to wants, and 20% to savings.',
      },
      {
        question: 'Which is NOT a fixed expense?',
        options: ['Rent', 'Grocery shopping', 'Car insurance', 'Phone bill'],
        correctAnswer: 1,
        explanation: 'Grocery shopping is a variable expense because it can change monthly. Others are fixed.',
      },
    ],
  },
  {
    title: 'Investment Basics Quiz',
    description: 'Learn fundamental investment concepts',
    ageGroup: 'fresh-graduate',
    category: 'investment',
    icon: '📈',
    difficulty: 'medium',
    estimatedTime: 12,
    instructions: 'Test your knowledge about investing basics.',
    questions: [
      {
        question: 'What does "diversification" mean?',
        options: [
          'Putting all money in one stock',
          'Spreading investments across different assets',
          'Buying only bonds',
          'Trading frequently',
        ],
        correctAnswer: 1,
        explanation: 'Diversification means spreading your investments across different types of assets to reduce risk.',
      },
      {
        question: 'What is a mutual fund?',
        options: [
          'A bank account',
          'A pooled investment managed by professionals',
          'A type of loan',
          'A savings account',
        ],
        correctAnswer: 1,
        explanation: 'A mutual fund pools money from many investors to purchase a diversified portfolio.',
      },
    ],
  },
  {
    title: 'Savings Goal Race',
    description: 'Calculate time needed to reach savings goals',
    ageGroup: 'fresh-graduate',
    category: 'budget',
    icon: '🏃',
    difficulty: 'easy',
    estimatedTime: 8,
    instructions: 'Solve problems about reaching savings goals.',
    questions: [
      {
        question: 'If you save $300/month with 5% annual interest, roughly how long to save $10,000?',
        options: ['3 years', '2.5 years', '1 year', '5 years'],
        correctAnswer: 1,
        explanation: 'At $300/month with compound interest, you\'ll reach $10,000 in approximately 2.5 years.',
      },
    ],
  },

  // Middle Age Games
  {
    title: 'Portfolio Builder',
    description: 'Learn to allocate investments across asset classes',
    ageGroup: 'middle-age',
    category: 'portfolio',
    icon: '🎯',
    difficulty: 'medium',
    estimatedTime: 15,
    instructions: 'Answer questions about building a balanced investment portfolio.',
    questions: [
      {
        question: 'At age 40, what is a typical stock/bond allocation?',
        options: ['70% stocks, 30% bonds', '50% stocks, 50% bonds', '80% stocks, 20% bonds', '30% stocks, 70% bonds'],
        correctAnswer: 0,
        explanation: 'At age 40, a common allocation is 70% stocks, 30% bonds to balance growth and stability.',
      },
      {
        question: 'What does rebalancing a portfolio mean?',
        options: [
          'Checking your balance online',
          'Adjusting asset allocation back to target percentages',
          'Buying more stocks',
          'Taking out money',
        ],
        correctAnswer: 1,
        explanation: 'Rebalancing means adjusting your portfolio back to your target allocation (e.g., 70/30).',
      },
    ],
  },
  {
    title: 'Wealth Simulation',
    description: 'Simulate long-term investment growth scenarios',
    ageGroup: 'middle-age',
    category: 'portfolio',
    icon: '📊',
    difficulty: 'hard',
    estimatedTime: 20,
    instructions: 'Understand how different strategies affect long-term wealth.',
    questions: [
      {
        question: 'If you invest $500/month for 25 years at 7% return, approximately how much do you have?',
        options: ['$250,000', '$385,000', '$500,000', '$600,000'],
        correctAnswer: 1,
        explanation: 'With compound interest over 25 years, $500/month at 7% annual returns grows to about $385,000.',
      },
    ],
  },
  {
    title: 'Expense Optimizer',
    description: 'Find ways to reduce expenses and increase savings',
    ageGroup: 'middle-age',
    category: 'budget',
    icon: '💳',
    difficulty: 'easy',
    estimatedTime: 10,
    instructions: 'Identify opportunities to optimize your monthly expenses.',
    questions: [
      {
        question: 'Which strategy can save the most money over 10 years?',
        options: [
          'Reduce coffee spending by $50/month',
          'Refinance mortgage to save $200/month',
          'Cut streaming services ($20/month)',
          'Reduce dining out by $30/month',
        ],
        correctAnswer: 1,
        explanation: '$200/month saved over 10 years = $24,000, much more than other options.',
      },
    ],
  },

  // Elderly Games
  {
    title: 'Legacy Planning Simulator',
    description: 'Plan your estate and legacy wisely',
    ageGroup: 'elderly',
    category: 'legacy',
    icon: '👨‍👩‍👧‍👦',
    difficulty: 'medium',
    estimatedTime: 15,
    instructions: 'Learn about effective legacy planning strategies.',
    questions: [
      {
        question: 'What is the primary benefit of having a will?',
        options: [
          'Avoiding all taxes',
          'Ensuring your assets go to intended beneficiaries',
          'Making your will public',
          'Protecting all assets',
        ],
        correctAnswer: 1,
        explanation: 'A will ensures your assets are distributed according to your wishes.',
      },
      {
        question: 'What percentage of estate can typically be passed tax-free (2024)?',
        options: ['$1 million', '$5 million', '$13+ million', 'No limit'],
        correctAnswer: 2,
        explanation: 'In 2024, there is a federal estate tax exemption of approximately $13+ million per person.',
      },
    ],
  },
  {
    title: 'Retirement Income Calculator',
    description: 'Calculate sustainable retirement income',
    ageGroup: 'elderly',
    category: 'retirement',
    icon: '🏖️',
    difficulty: 'medium',
    estimatedTime: 12,
    instructions: 'Understand retirement income planning and the 4% rule.',
    questions: [
      {
        question: 'What is the 4% rule in retirement?',
        options: [
          'Save 4% of income',
          'Withdraw 4% of portfolio annually',
          'Invest 4% in bonds',
          'Work 4 more years',
        ],
        correctAnswer: 1,
        explanation: 'The 4% rule suggests withdrawing 4% of your portfolio in the first year, then adjusting for inflation.',
      },
      {
        question: 'If you have $500,000 saved, how much can you withdraw yearly (4% rule)?',
        options: ['$10,000', '$15,000', '$20,000', '$25,000'],
        correctAnswer: 2,
        explanation: '4% of $500,000 = $20,000 per year',
      },
    ],
  },
  {
    title: 'Estate Planning Guide',
    description: 'Master the essentials of estate planning',
    ageGroup: 'elderly',
    category: 'legacy',
    icon: '📋',
    difficulty: 'easy',
    estimatedTime: 14,
    instructions: 'Learn key estate planning concepts and strategies.',
    questions: [
      {
        question: 'What does a power of attorney do?',
        options: [
          'Gives legal authority to someone to handle your affairs',
          'Makes someone a lawyer',
          'Controls your bank account',
          'Assigns guardianship',
        ],
        correctAnswer: 0,
        explanation: 'A power of attorney grants someone authority to act on your behalf in legal or financial matters.',
      },
      {
        question: 'What is a trust?',
        options: [
          'A type of investment',
          'A legal entity to hold and manage assets',
          'A bank savings account',
          'Insurance policy',
        ],
        correctAnswer: 1,
        explanation: 'A trust is a legal arrangement where assets are held and managed for beneficiaries.',
      },
    ],
  },
];

async function seedGames() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || "finance_companion";
    
    console.log('📍 MongoDB URI:', mongoUri ? 'SET' : 'NOT SET');
    console.log('📁 Database name:', dbName);
    
    await mongoose.connect(mongoUri, { dbName });
    console.log('Connected to MongoDB');
    
    // Check existing games first
    const existingCount = await Game.countDocuments();
    console.log(`Found ${existingCount} existing games`);

    // Clear existing games
    await Game.deleteMany({});
    console.log('Cleared existing games');

    // Insert new games
    const result = await Game.insertMany(games);
    console.log(`✅ Successfully seeded ${result.length} games`);
    
    // Verify they were inserted
    const verifyCount = await Game.countDocuments();
    console.log(`✅ Verified: ${verifyCount} games in database`);

    // Show fresh-graduate games
    const freshGradGames = await Game.find({ ageGroup: 'fresh-graduate' });
    console.log(`✅ Fresh-graduate games: ${freshGradGames.length}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding games:', error);
    process.exit(1);
  }
}

seedGames();

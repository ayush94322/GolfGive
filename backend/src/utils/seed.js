require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('../../config/supabase');

const seed = async () => {
  console.log('Seeding database...\n');

  // ─── Admin user ─────────────────────────────────────────────────────────────
  const adminEmail = 'admin@golfcharity.com';
  const adminHash = await bcrypt.hash('Admin@1234!', 12);

  const { data: admin, error: adminError } = await supabase
    .from('users')
    .upsert({
      email: adminEmail,
      password_hash: adminHash,
      first_name: 'Platform',
      last_name: 'Admin',
      role: 'admin',
      is_email_verified: true,
    }, { onConflict: 'email' })
    .select('id, email')
    .single();

  if (adminError) {
    console.error('Admin seed error:', adminError.message);
  } else {
    console.log(`Admin: ${admin.email}`);
  }

  // ─── Test subscriber ─────────────────────────────────────────────────────────
  const subHash = await bcrypt.hash('Subscriber@1234!', 12);
  const { data: subscriber } = await supabase
    .from('users')
    .upsert({
      email: 'subscriber@test.com',
      password_hash: subHash,
      first_name: 'Test',
      last_name: 'Subscriber',
      role: 'subscriber',
      is_email_verified: true,
    }, { onConflict: 'email' })
    .select('id, email')
    .single();

  console.log(`Subscriber: ${subscriber?.email}`);

  // ─── Charities ───────────────────────────────────────────────────────────────
  const charities = [
    {
      name: 'Cancer Research UK',
      slug: 'cancer-research-uk',
      description: 'Cancer Research UK is the world\'s largest independent cancer research organisation. We fund scientists, doctors and nurses to help us understand cancer better and develop new tests and treatments.',
      short_bio: 'World-leading cancer research and awareness charity.',
      website_url: 'https://www.cancerresearchuk.org',
      is_featured: true,
      is_active: true,
    },
    {
      name: 'Children in Need',
      slug: 'children-in-need',
      description: 'BBC Children in Need raises money to support disadvantaged children and young people across the UK. Every penny raised goes toward helping children facing poverty, abuse, or neglect.',
      short_bio: 'Supporting disadvantaged children and young people across the UK.',
      website_url: 'https://www.bbc.co.uk/cbbc/quizzes/children-in-need',
      is_featured: true,
      is_active: true,
    },
    {
      name: 'Macmillan Cancer Support',
      slug: 'macmillan-cancer-support',
      description: 'Macmillan Cancer Support provides specialist health care and support for people affected by cancer. We also fund health and social care professionals and campaign to improve cancer care.',
      short_bio: 'Life-changing care and support for those affected by cancer.',
      website_url: 'https://www.macmillan.org.uk',
      is_featured: false,
      is_active: true,
    },
    {
      name: 'Alzheimer\'s Society',
      slug: 'alzheimers-society',
      description: 'Alzheimer\'s Society campaigns for change, funds research to find a cure, and provides vital care and support for people living with dementia and their families.',
      short_bio: 'Leading dementia charity fighting for those affected by Alzheimer\'s.',
      website_url: 'https://www.alzheimers.org.uk',
      is_featured: false,
      is_active: true,
    },
    {
      name: 'British Heart Foundation',
      slug: 'british-heart-foundation',
      description: 'The British Heart Foundation funds research into heart and circulatory diseases and the conditions that cause them. We\'re fighting for every heartbeat in the UK.',
      short_bio: 'Funding life-saving heart research across the UK.',
      website_url: 'https://www.bhf.org.uk',
      is_featured: false,
      is_active: true,
    },
  ];

  for (const charity of charities) {
    const { error } = await supabase
      .from('charities')
      .upsert(charity, { onConflict: 'slug' });
    if (error) {
      console.error(`Charity error (${charity.slug}):`, error.message);
    } else {
      console.log(`Charity: ${charity.name}`);
    }
  }

  // ─── Upcoming draw ───────────────────────────────────────────────────────────
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const drawMonth = nextMonth.toISOString().split('T')[0];

  const { error: drawError } = await supabase
    .from('draws')
    .upsert({
      title: `Monthly Draw — ${nextMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      draw_month: drawMonth,
      logic: 'random',
      status: 'scheduled',
      created_by: admin?.id,
    }, { onConflict: 'draw_month' });

  if (!drawError) {
    console.log(`Upcoming draw scheduled for: ${drawMonth}`);
  }

  // ─── Sample scores for test subscriber ───────────────────────────────────────
  if (subscriber) {
    const sampleScores = [
      { score: 28, played_at: '2026-03-01', course_name: 'St Andrews Links' },
      { score: 32, played_at: '2026-03-08', course_name: 'Wentworth Club' },
      { score: 25, played_at: '2026-03-12', course_name: 'Royal Birkdale' },
      { score: 35, played_at: '2026-03-19', course_name: 'Carnoustie Golf Links' },
      { score: 30, played_at: '2026-03-24', course_name: 'Augusta National' },
    ];

    // Delete existing scores first
    await supabase.from('golf_scores').delete().eq('user_id', subscriber.id);

    for (const s of sampleScores) {
      await supabase.from('golf_scores').insert({ ...s, user_id: subscriber.id });
    }
    console.log(`Sample scores added for ${subscriber.email}`);
  }

  console.log('\nSeed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin:       admin@golfcharity.com');
  console.log('  Admin pass:  Admin@1234!');
  console.log('  Subscriber:  subscriber@test.com');
  console.log('  Sub pass:    Subscriber@1234!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

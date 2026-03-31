require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../services/database');

async function seed() {
  const db = getDatabase();

  console.log('Seeding database...');

  // Clean up existing seed data by email to allow re-runs
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('teacher@school.edu');
  if (existing) {
    db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
    console.log('Removed existing seed data.');
  }

  // ── Users ──────────────────────────────────────────────────────────────────
  const userId = uuidv4();
  const passwordHash = await bcrypt.hash('password123', 10);
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)
  `).run(userId, 'teacher1', 'teacher@school.edu', passwordHash);
  console.log('Created user: teacher@school.edu / password123');

  // ── Class ──────────────────────────────────────────────────────────────────
  const classId = uuidv4();
  db.prepare(`
    INSERT INTO classes (id, user_id, name, description) VALUES (?, ?, ?, ?)
  `).run(classId, userId, 'English 101', 'Introduction to Literary Analysis');

  // ── Assignment ─────────────────────────────────────────────────────────────
  const assignmentId = uuidv4();
  db.prepare(`
    INSERT INTO assignments (id, class_id, title, description, status) VALUES (?, ?, ?, ?, ?)
  `).run(
    assignmentId,
    classId,
    'The Great Gatsby Essay',
    'Analyze the themes of wealth, class, and the American Dream in F. Scott Fitzgerald\'s The Great Gatsby.',
    'active'
  );

  // ── Rubric Categories ──────────────────────────────────────────────────────
  const rubricCategories = [
    { name: 'Thesis', description: 'Clear, arguable thesis statement that addresses the prompt', max_points: 25 },
    { name: 'Evidence', description: 'Relevant textual evidence cited and integrated effectively', max_points: 25 },
    { name: 'Analysis', description: 'Insightful analysis connecting evidence to argument', max_points: 30 },
    { name: 'Writing Quality', description: 'Clear prose, proper grammar, strong structure', max_points: 20 },
  ];
  const rubricIds = rubricCategories.map((cat, i) => {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO rubric_categories (id, assignment_id, name, description, max_points, order_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, assignmentId, cat.name, cat.description, cat.max_points, i);
    return id;
  });

  // ── Teacher Guidance ───────────────────────────────────────────────────────
  db.prepare(`
    INSERT INTO teacher_guidance (id, assignment_id, content) VALUES (?, ?, ?)
  `).run(
    uuidv4(),
    assignmentId,
    `When grading these essays, focus on whether students genuinely engage with the text. 
A strong thesis should make a specific argument (e.g., "Fitzgerald uses Gatsby's mansion to expose the emptiness of the American Dream") rather than a vague statement. 
For evidence, reward students who quote directly and explain the significance—not just drop quotes. 
The best analytical responses will connect wealth and class to character motivation or to Fitzgerald's critique of 1920s society. 
Writing Quality: deduct points for run-on sentences and unclear pronoun references, which are common in this class. 
Essays should be 4–6 paragraphs. Responses under 300 words should receive no more than 60/100 total.`
  );

  // ── Students & Essays ──────────────────────────────────────────────────────
  const studentEssays = [
    {
      name: 'Alice Johnson',
      email: 'alice@school.edu',
      essay: `The Great Gatsby by F. Scott Fitzgerald is a powerful critique of the American Dream and the hollowness of the wealthy elite. Through the character of Jay Gatsby, Fitzgerald demonstrates that the relentless pursuit of wealth and status ultimately leads to moral corruption and personal destruction.

Gatsby's obsession with Daisy Buchanan represents his deeper fixation on an idealized past that can never truly be recaptured. The green light at the end of Daisy's dock symbolizes this unattainable dream—always visible, never within reach. As Nick observes, Gatsby "believed in the green light, the orgastic future that year by year recedes before us." This image encapsulates Fitzgerald's central argument: the American Dream is built on illusion.

The contrast between East Egg and West Egg reveals the rigid class structures that underlie the supposed meritocracy of American society. Gatsby may have acquired great wealth, but he remains an outsider in the eyes of Tom Buchanan, who dismisses him as a social inferior. Tom's casual cruelty toward Gatsby exposes the hypocrisy of old money, which claims superiority based on birth rather than merit.

Fitzgerald also indicts the carelessness of the ultra-wealthy. Tom and Daisy "smashed up things and creatures and then retreated back into their money," leaving others to deal with the consequences. This carelessness is most vividly illustrated when Daisy kills Myrtle Wilson with Gatsby's car and allows Gatsby to take the blame—ultimately leading to his death.

In the end, Gatsby's murder and the failure of his dream serve as Fitzgerald's ultimate condemnation of a society that valorizes wealth at the expense of human connection and moral integrity. The novel reminds us that the American Dream, as popularly conceived, is not a promise of fulfillment but a gilded trap.`,
      grade: 91,
      letter_grade: 'A',
      rubric_scores: { [rubricIds[0]]: 24, [rubricIds[1]]: 23, [rubricIds[2]]: 27, [rubricIds[3]]: 17 },
      feedback_likes: 'Excellent thesis that makes a specific, arguable claim. Strong use of textual evidence with meaningful integration. Analysis clearly connects the green light symbol to Fitzgerald\'s broader critique.',
      feedback_improvements: 'The final paragraph could more explicitly revisit the thesis. Minor grammatical issues in paragraph 3 ("whom" vs "who").',
    },
    {
      name: 'Brian Martinez',
      email: 'brian@school.edu',
      essay: `In F. Scott Fitzgerald's The Great Gatsby, the theme of wealth is central to understanding the characters and their motivations. Jay Gatsby is a man who has worked hard to become rich, but his wealth does not bring him happiness. This shows that money cannot buy everything, especially love and belonging.

Gatsby throws lavish parties at his mansion every weekend, hoping that Daisy will one day walk through the door. These parties are described as spectacular events with hundreds of guests, but Gatsby himself rarely joins in. He stands apart, watching, waiting. This image of the lonely host among the crowd is a powerful metaphor for the isolation that wealth can create.

Tom Buchanan represents old money and all the arrogance that comes with it. He looks down on Gatsby because Gatsby is "new money" from a mysterious background. Tom's racist comments and his affairs show that being born into privilege does not make a person morally superior. Fitzgerald seems to be saying that all forms of wealth can corrupt.

The Valley of Ashes, a gray industrial wasteland between West Egg and New York City, symbolizes the forgotten underclass that supports the luxury of the wealthy. George and Myrtle Wilson live in this desolate place, and their lives are destroyed by the careless actions of the rich. The eyes of Doctor T.J. Eckleburg on the billboard seem to watch over this moral wasteland without comment—like a god who has abandoned his people.

The Great Gatsby is ultimately a tragic story about a man who dreamed too big. Gatsby's death at the end is heartbreaking because we see how much he sacrificed for a dream that was never going to come true. Fitzgerald uses his story to warn readers about the dangers of obsession and the corrupting influence of wealth in American society.`,
      grade: 78,
      letter_grade: 'C+',
      rubric_scores: { [rubricIds[0]]: 18, [rubricIds[1]]: 20, [rubricIds[2]]: 22, [rubricIds[3]]: 18 },
      feedback_likes: 'Good command of the novel\'s plot and symbols. The Valley of Ashes paragraph is well-developed. Clear and readable prose throughout.',
      feedback_improvements: 'Thesis is too vague ("money cannot buy everything"). Needs a more specific argument about Fitzgerald\'s critique. Evidence is paraphrased rather than quoted—direct quotations with page references would strengthen the analysis.',
    },
    {
      name: 'Carmen Lee',
      email: 'carmen@school.edu',
      essay: `F. Scott Fitzgerald's The Great Gatsby exposes the moral bankruptcy of the American Dream by showing how the obsessive pursuit of wealth and status destroys authentic human relationships and ultimately leads to ruin. Through Gatsby's doomed romance with Daisy, Fitzgerald argues that a society built on materialism cannot sustain genuine love or meaningful connection.

Gatsby's entire identity is a fabrication designed to win Daisy's approval. He reinvents himself as "Jay Gatsby," a man of mysterious wealth, erasing his humble origins as James Gatz of North Dakota. This self-invention mirrors the mythology of the self-made American man, but Fitzgerald subverts this ideal by showing it to be fundamentally deceptive. When Nick tells Gatsby he can't repeat the past, Gatsby responds incredulously, "Can't repeat the past? Why of course you can!" This reveals how Gatsby's dream is rooted not in ambition but in denial—an unwillingness to accept the passage of time and the finality of loss.

Daisy herself is presented as both the object of Gatsby's dream and its embodiment. Her voice, famously described as "full of money," conflates romantic desire with financial aspiration. Gatsby doesn't love Daisy as a person; he loves the status and validation she represents. Their reunion scene, in which Gatsby nearly collapses beneath the weight of his own expectations, illustrates the gap between the dream and reality: "the colossal significance of that light had now vanished forever...His count of enchanted objects had diminished by one."

Fitzgerald reinforces this critique through Nick's growing disillusionment. Nick arrives in New York enchanted by the glamour of the wealthy, but by the novel's end, he is deeply unsettled by the moral emptiness he has witnessed. His decision to return to the Midwest signals a rejection of the East's corrupted values.

The novel closes with one of literature's most resonant images: "So we beat on, boats against the current, borne back ceaselessly into the past." This line, with its suggestion of futility and backward motion, is Fitzgerald's definitive statement on the American Dream—a promise that propels people forward while anchoring them to the past, ensuring that the dream can never truly be fulfilled.`,
      grade: 96,
      letter_grade: 'A+',
      rubric_scores: { [rubricIds[0]]: 25, [rubricIds[1]]: 24, [rubricIds[2]]: 29, [rubricIds[3]]: 18 },
      feedback_likes: 'Outstanding thesis and argumentation throughout. Exceptional use of direct quotations, all precisely chosen and richly analyzed. The reading of Daisy\'s voice as "full of money" is particularly insightful. The closing paragraph elegantly ties back to the central argument.',
      feedback_improvements: 'Minor: the transition between paragraph 3 and 4 could be smoother. Consider adding one sentence to bridge Nick\'s disillusionment back to the Gatsby/Daisy dynamic before shifting focus.',
    },
    {
      name: 'David Kim',
      email: 'david@school.edu',
      essay: `The Great Gatsby, written by F. Scott Fitzgerald in 1925, is one of the greatest American novels ever written. It is set during the Jazz Age in New York and follows the story of Nick Carraway, who moves next door to the mysterious millionaire Jay Gatsby. The novel explores themes of wealth, love, class, and the American Dream.

Jay Gatsby is the main character of the novel. He is rich and throws big parties. He loves Daisy Buchanan who is married to Tom Buchanan. Gatsby and Daisy used to date before Gatsby went to war. When he came back, Daisy had already married Tom. Now Gatsby wants to get Daisy back.

One of the most famous symbols in the novel is the green light. Gatsby reaches out toward it at night from his dock. The green light is on Daisy's dock across the bay. It represents hope and Gatsby's dream of being with Daisy again.

Tom Buchanan is a bad person. He is racist and has an affair with Myrtle Wilson. When Daisy hits Myrtle with Gatsby's car, Tom tells Myrtle's husband George that it was Gatsby who did it. George then shoots Gatsby. This is very unfair to Gatsby because he was just trying to protect Daisy.

The American Dream is an important theme in the novel. Gatsby worked hard to become rich so he could impress Daisy. But in the end, it didn't work out for him. This shows that the American Dream is not always achievable, especially if you come from a poor background like Gatsby did.

In conclusion, The Great Gatsby is a sad story about a man who tried to live the American Dream but failed. Fitzgerald uses beautiful writing and rich symbolism to explore what it means to dream big in America.`,
      grade: null,
      letter_grade: null,
      rubric_scores: null,
      feedback_likes: null,
      feedback_improvements: null,
    },
    {
      name: 'Emma Wilson',
      email: 'emma@school.edu',
      essay: `Fitzgerald's The Great Gatsby remains one of the most incisive explorations of class anxiety and the performative nature of the American Dream. Through the contrast between old and new money, and through the character of Nick Carraway as both participant and observer, Fitzgerald interrogates the mechanisms by which American society simultaneously promises social mobility and punishes those who attempt it.

The geography of the novel is itself an argument. East Egg, home to Tom and Daisy Buchanan, represents inherited wealth and social permanence. West Egg, where Gatsby builds his ostentatious mansion, represents newly acquired wealth—and the desperate striving of those who have money but not "breeding." This spatial distinction is not merely metaphorical; it structures the social interactions and moral judgments of every character in the novel. When Tom snidely tells Nick that Gatsby's party guests don't know each other and that "I may be old-fashioned in my ideas, but women run around too much these days," he reveals his belief that West Egg's freedoms are a symptom of moral disorder—a disorder he associates with outsiders like Gatsby.

Gatsby's parties are an extended performance of legitimacy. He imports crates of oranges, employs dozens of servants, and invites people he has never met—all to create the illusion of a social world in which he belongs. Yet Gatsby himself is conspicuously absent from his own parties. He watches the festivities from a distance, as if auditioning for a role he can never quite play convincingly. The parties are not celebrations; they are auditions.

The novel's most devastating critique, however, is directed not at Gatsby's aspirations but at the system that makes those aspirations necessary. Nick is complicit in this system—he facilitates Gatsby's reunion with Daisy, watches moral transgressions without intervention, and only retroactively assigns meaning to what he has witnessed. His famous comment that he is "one of the few honest people" he has ever known rings hollow against the backdrop of his sustained passivity.

Fitzgerald's closing image—"boats against the current, borne back ceaselessly into the past"—is not merely a lament for Gatsby. It is a structural diagnosis of the American condition: a culture that mythologizes forward progress while the current of class, race, and inherited advantage perpetually drags individuals back to where they started.`,
      grade: null,
      letter_grade: null,
      rubric_scores: null,
      feedback_likes: null,
      feedback_improvements: null,
    },
  ];

  for (let i = 0; i < studentEssays.length; i++) {
    const s = studentEssays[i];

    const studentId = uuidv4();
    db.prepare(`
      INSERT INTO students (id, class_id, name, email) VALUES (?, ?, ?, ?)
    `).run(studentId, classId, s.name, s.email);

    const essayId = uuidv4();
    const isManuallyGraded = s.grade !== null;

    db.prepare(`
      INSERT INTO essays (id, assignment_id, student_id, student_name, file_name, essay_text, status, upload_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      essayId,
      assignmentId,
      studentId,
      s.name,
      null,
      s.essay,
      isManuallyGraded ? 'manually_graded' : 'uploaded',
      i + 1
    );

    if (isManuallyGraded) {
      db.prepare(`
        INSERT INTO grades (id, essay_id, grader_type, grade, letter_grade, feedback_likes, feedback_improvements, rubric_scores, created_at)
        VALUES (?, ?, 'teacher', ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        essayId,
        s.grade,
        s.letter_grade,
        s.feedback_likes,
        s.feedback_improvements,
        JSON.stringify(s.rubric_scores)
      );

      db.prepare(`
        INSERT INTO review_history (id, essay_id, action, new_value) VALUES (?, ?, 'manual_grade', ?)
      `).run(uuidv4(), essayId, JSON.stringify({ grade: s.grade, letter_grade: s.letter_grade }));
    }
  }

  console.log(`Seeded ${studentEssays.length} essays (3 manually graded, 2 awaiting grading).`);
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const generateQuizPDF = (quizData, userAnswers, score, title) => {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text('Quiz Results', 105, 15, { align: 'center' });
  
  // Add quiz information
  doc.setFontSize(12);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);
  doc.text(`Title: ${title || 'MCQ Quiz'}`, 20, 38);
  doc.text(`Score: ${score.correct}/${score.total} (${score.percentage}%)`, 20, 46);
  
  // Add questions and answers
  doc.setFontSize(14);
  doc.text('Questions & Answers', 105, 55, { align: 'center' });
  
  let yPos = 65;
  let pageNumber = 1;
  
  quizData.forEach((question, index) => {
    const userAnswer = userAnswers[index] || 'Not answered';
    const isCorrect = userAnswer === question.answer;
    
    // Add space between questions
    if (index > 0) {
      yPos += 10;
    }
    
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
      pageNumber++;
    }
    
    // Question number and text
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Question ${index + 1}:`, 20, yPos);
    
    // Question text - handle multi-line text
    doc.setFont(undefined, 'normal');
    const splitText = doc.splitTextToSize(question.question, 170);
    doc.text(splitText, 20, yPos + 7);
    
    yPos += (splitText.length * 7) + 7;
    
    // Options
    doc.setFontSize(10);
    Object.entries(question.options).forEach(([key, text]) => {
      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
        pageNumber++;
      }
      
      // Format option text with word wrap
      const optionText = `${key}. ${text}`;
      const wrappedOptionText = doc.splitTextToSize(optionText, 160);
      
      // Highlight correct and user answers
      if (key === question.answer) {
        doc.setTextColor(0, 128, 0); // Green for correct answer
      } else if (key === userAnswer && userAnswer !== question.answer) {
        doc.setTextColor(255, 0, 0); // Red for incorrect answer
      } else {
        doc.setTextColor(0, 0, 0); // Black for other options
      }
      
      doc.text(wrappedOptionText, 30, yPos);
      yPos += wrappedOptionText.length * 5;
    });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Show user's answer and correct status
    doc.setFontSize(11);
    if (userAnswer === 'Not answered') {
      doc.setTextColor(255, 0, 0);
      doc.text(`You did not answer this question. The correct answer was ${question.answer}.`, 20, yPos + 5);
    } else if (isCorrect) {
      doc.setTextColor(0, 128, 0);
      doc.text(`Correct! You selected ${userAnswer}.`, 20, yPos + 5);
    } else {
      doc.setTextColor(255, 0, 0);
      doc.text(`Incorrect! You selected ${userAnswer}. The correct answer was ${question.answer}.`, 20, yPos + 5);
    }
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    yPos += 15;
  });
  
  // Summary table - Use a simpler approach instead of autoTable
  doc.setFontSize(14);
  doc.text('Summary', 105, yPos + 10, { align: 'center' });
  
  yPos += 20;
  
  // Create a simple table manually
  const tableData = [
    ['Total Questions', score.total.toString()],
    ['Correct Answers', score.correct.toString()],
    ['Incorrect Answers', (score.total - score.correct).toString()],
    ['Score Percentage', `${score.percentage}%`]
  ];
  
  const colWidth = 80;
  const rowHeight = 10;
  const tableX = 65;
  
  // Table headers
  doc.setFillColor(44, 62, 80);
  doc.setTextColor(255, 255, 255);
  doc.rect(tableX, yPos, colWidth, rowHeight, 'F');
  doc.rect(tableX + colWidth, yPos, colWidth, rowHeight, 'F');
  doc.setFontSize(12);
  doc.text('Metric', tableX + 5, yPos + 7);
  doc.text('Value', tableX + colWidth + 5, yPos + 7);
  
  // Table body
  doc.setTextColor(0, 0, 0);
  tableData.forEach((row, i) => {
    const rowY = yPos + (i + 1) * rowHeight;
    
    // Add alternating background
    if (i % 2 === 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(tableX, rowY, colWidth, rowHeight, 'F');
      doc.rect(tableX + colWidth, rowY, colWidth, rowHeight, 'F');
    }
    
    // Add border
    doc.rect(tableX, rowY, colWidth, rowHeight);
    doc.rect(tableX + colWidth, rowY, colWidth, rowHeight);
    
    // Add text
    doc.text(row[0], tableX + 5, rowY + 7);
    doc.text(row[1], tableX + colWidth + 5, rowY + 7);
  });
  
  // Add page numbers
  const totalPages = pageNumber;
  for (let i = 0; i < totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(`Page ${i + 1} of ${totalPages}`, 195, 285, { align: 'right' });
  }
  
  return doc;
};

export default generateQuizPDF;
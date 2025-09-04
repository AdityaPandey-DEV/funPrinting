import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface TemplateData {
  name: string;
  rollNo: string;
  subject?: string;
  teacher?: string;
  course?: string;
  semester?: string;
  date?: string;
  title?: string;
  description?: string;
  lab?: string;
  experiment?: string;
}

export async function generateAssignmentCover(data: TemplateData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    // Use TimesRoman as fallback if Helvetica is not available
    let font, regularFont;
    try {
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch (error) {
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    }

    const { width, height } = page.getSize();
    const fontSize = 24;
    const regularFontSize = 14;

    // Title
    page.drawText('ASSIGNMENT', {
      x: width / 2 - font.widthOfTextAtSize('ASSIGNMENT', fontSize) / 2,
      y: height - 100,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Student details
    page.drawText(`Name: ${data.name}`, {
      x: 100,
      y: height - 200,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Roll No: ${data.rollNo}`, {
      x: 100,
      y: height - 230,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    if (data.subject) {
      page.drawText(`Subject: ${data.subject}`, {
        x: 100,
        y: height - 260,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.teacher) {
      page.drawText(`Teacher: ${data.teacher}`, {
        x: 100,
        y: height - 290,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.course) {
      page.drawText(`Course: ${data.course}`, {
        x: 100,
        y: height - 320,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.semester) {
      page.drawText(`Semester: ${data.semester}`, {
        x: 100,
        y: height - 350,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.date) {
      page.drawText(`Date: ${data.date}`, {
        x: 100,
        y: height - 380,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    return await pdfDoc.save();
  } catch (error) {
    console.error('Error generating assignment cover:', error);
    throw new Error('Failed to generate assignment cover PDF');
  }
}

export async function generateResume(data: TemplateData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    let font, regularFont;
    try {
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch (error) {
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    }

    const { width, height } = page.getSize();
    const titleFontSize = 28;
    const headerFontSize = 18;
    const regularFontSize = 12;

    // Name as title
    page.drawText(data.name, {
      x: width / 2 - font.widthOfTextAtSize(data.name, titleFontSize) / 2,
      y: height - 80,
      size: titleFontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Roll No
    page.drawText(`Roll No: ${data.rollNo}`, {
      x: width / 2 - regularFont.widthOfTextAtSize(`Roll No: ${data.rollNo}`, regularFontSize) / 2,
      y: height - 120,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    // Course
    if (data.course) {
      page.drawText(`Course: ${data.course}`, {
        x: width / 2 - regularFont.widthOfTextAtSize(`Course: ${data.course}`, regularFontSize) / 2,
        y: height - 140,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    // Education Section
    page.drawText('EDUCATION', {
      x: 100,
      y: height - 200,
      size: headerFontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    if (data.subject) {
      page.drawText(`Subject: ${data.subject}`, {
        x: 100,
        y: height - 230,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.semester) {
      page.drawText(`Semester: ${data.semester}`, {
        x: 100,
        y: height - 250,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    return await pdfDoc.save();
  } catch (error) {
    console.error('Error generating resume:', error);
    throw new Error('Failed to generate resume PDF');
  }
}

export async function generateLabReport(data: TemplateData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    let font, regularFont;
    try {
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch (error) {
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    }

    const { width, height } = page.getSize();
    const fontSize = 24;
    const regularFontSize = 14;

    // Title
    page.drawText('LABORATORY REPORT', {
      x: width / 2 - font.widthOfTextAtSize('LABORATORY REPORT', fontSize) / 2,
      y: height - 100,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Student details
    page.drawText(`Name: ${data.name}`, {
      x: 100,
      y: height - 200,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Roll No: ${data.rollNo}`, {
      x: 100,
      y: height - 230,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    if (data.subject) {
      page.drawText(`Subject: ${data.subject}`, {
        x: 100,
        y: height - 260,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.teacher) {
      page.drawText(`Lab Instructor: ${data.teacher}`, {
        x: 100,
        y: height - 290,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.date) {
      page.drawText(`Date: ${data.date}`, {
        x: 100,
        y: height - 320,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    return await pdfDoc.save();
  } catch (error) {
    console.error('Error generating lab report:', error);
    throw new Error('Failed to generate lab report PDF');
  }
}

export async function generateCertificate(data: TemplateData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    let font, regularFont;
    try {
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    } catch (error) {
      // Fallback to Helvetica if TimesRoman fails
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    const { width, height } = page.getSize();
    const titleFontSize = 32;
    const regularFontSize = 16;

    // Certificate title
    page.drawText('CERTIFICATE OF COMPLETION', {
      x: width / 2 - font.widthOfTextAtSize('CERTIFICATE OF COMPLETION', titleFontSize) / 2,
      y: height - 150,
      size: titleFontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    // This is to certify that
    page.drawText('This is to certify that', {
      x: width / 2 - regularFont.widthOfTextAtSize('This is to certify that', regularFontSize) / 2,
      y: height - 250,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    // Student name
    page.drawText(data.name, {
      x: width / 2 - font.widthOfTextAtSize(data.name, titleFontSize) / 2,
      y: height - 300,
      size: titleFontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Roll No
    page.drawText(`Roll No: ${data.rollNo}`, {
      x: width / 2 - regularFont.widthOfTextAtSize(`Roll No: ${data.rollNo}`, regularFontSize) / 2,
      y: height - 350,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    // Course
    if (data.course) {
      page.drawText(`Course: ${data.course}`, {
        x: width / 2 - regularFont.widthOfTextAtSize(`Course: ${data.course}`, regularFontSize) / 2,
        y: height - 380,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    // Date
    if (data.date) {
      page.drawText(`Date: ${data.date}`, {
        x: width / 2 - regularFont.widthOfTextAtSize(`Date: ${data.date}`, regularFontSize) / 2,
        y: height - 450,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    return await pdfDoc.save();
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw new Error('Failed to generate certificate PDF');
  }
}

// Lab Manual Generation Functions
export async function generateCSLabManual(data: TemplateData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    let font, regularFont;
    try {
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch (error) {
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    }

    const { width, height } = page.getSize();
    const titleFontSize = 24;
    const regularFontSize = 14;

    // Title
    page.drawText('COMPUTER SCIENCE LAB MANUAL', {
      x: width / 2 - font.widthOfTextAtSize('COMPUTER SCIENCE LAB MANUAL', titleFontSize) / 2,
      y: height - 80,
      size: titleFontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Student details
    page.drawText(`Student Name: ${data.name}`, {
      x: 100,
      y: height - 150,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Roll Number: ${data.rollNo}`, {
      x: 100,
      y: height - 180,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    if (data.course) {
      page.drawText(`Course: ${data.course}`, {
        x: 100,
        y: height - 210,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.semester) {
      page.drawText(`Semester: ${data.semester}`, {
        x: 100,
        y: height - 240,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.subject) {
      page.drawText(`Subject: ${data.subject}`, {
        x: 100,
        y: height - 270,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.lab) {
      page.drawText(`Lab: ${data.lab}`, {
        x: 100,
        y: height - 300,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.experiment) {
      page.drawText(`Experiment: ${data.experiment}`, {
        x: 100,
        y: height - 330,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.teacher) {
      page.drawText(`Lab Instructor: ${data.teacher}`, {
        x: 100,
        y: height - 360,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.date) {
      page.drawText(`Date: ${data.date}`, {
        x: 100,
        y: height - 390,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    // Add lab manual content sections
    page.drawText('EXPERIMENT DETAILS', {
      x: 100,
      y: height - 450,
      size: 18,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText('Aim:', {
      x: 100,
      y: height - 480,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Theory:', {
      x: 100,
      y: height - 510,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Procedure:', {
      x: 100,
      y: height - 540,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Observations:', {
      x: 100,
      y: height - 570,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Result:', {
      x: 100,
      y: height - 600,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error('Error generating CS lab manual:', error);
    throw new Error('Failed to generate CS lab manual PDF');
  }
}

export async function generateElectronicsLabManual(data: TemplateData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    let font, regularFont;
    try {
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch (error) {
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    }

    const { width, height } = page.getSize();
    const titleFontSize = 24;
    const regularFontSize = 14;

    // Title
    page.drawText('ELECTRONICS LAB MANUAL', {
      x: width / 2 - font.widthOfTextAtSize('ELECTRONICS LAB MANUAL', titleFontSize) / 2,
      y: height - 80,
      size: titleFontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Student details (same structure as CS lab manual)
    page.drawText(`Student Name: ${data.name}`, {
      x: 100,
      y: height - 150,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Roll Number: ${data.rollNo}`, {
      x: 100,
      y: height - 180,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    if (data.course) {
      page.drawText(`Course: ${data.course}`, {
        x: 100,
        y: height - 210,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.semester) {
      page.drawText(`Semester: ${data.semester}`, {
        x: 100,
        y: height - 240,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.subject) {
      page.drawText(`Subject: ${data.subject}`, {
        x: 100,
        y: height - 270,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.lab) {
      page.drawText(`Lab: ${data.lab}`, {
        x: 100,
        y: height - 300,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.experiment) {
      page.drawText(`Experiment: ${data.experiment}`, {
        x: 100,
        y: height - 330,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.teacher) {
      page.drawText(`Lab Instructor: ${data.teacher}`, {
        x: 100,
        y: height - 360,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.date) {
      page.drawText(`Date: ${data.date}`, {
        x: 100,
        y: height - 390,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    // Add electronics-specific sections
    page.drawText('CIRCUIT DIAGRAM', {
      x: 100,
      y: height - 450,
      size: 18,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText('Components Required:', {
      x: 100,
      y: height - 480,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Circuit Design:', {
      x: 100,
      y: height - 510,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Observations:', {
      x: 100,
      y: height - 540,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Calculations:', {
      x: 100,
      y: height - 570,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Result:', {
      x: 100,
      y: height - 600,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error('Error generating Electronics lab manual:', error);
    throw new Error('Failed to generate Electronics lab manual PDF');
  }
}

export async function generateMechanicalLabManual(data: TemplateData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    let font, regularFont;
    try {
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch (error) {
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    }

    const { width, height } = page.getSize();
    const titleFontSize = 24;
    const regularFontSize = 14;

    // Title
    page.drawText('MECHANICAL ENGINEERING LAB MANUAL', {
      x: width / 2 - font.widthOfTextAtSize('MECHANICAL ENGINEERING LAB MANUAL', titleFontSize) / 2,
      y: height - 80,
      size: titleFontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Student details (same structure)
    page.drawText(`Student Name: ${data.name}`, {
      x: 100,
      y: height - 150,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Roll Number: ${data.rollNo}`, {
      x: 100,
      y: height - 180,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    if (data.course) {
      page.drawText(`Course: ${data.course}`, {
        x: 100,
        y: height - 210,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.semester) {
      page.drawText(`Semester: ${data.semester}`, {
        x: 100,
        y: height - 240,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.subject) {
      page.drawText(`Subject: ${data.subject}`, {
        x: 100,
        y: height - 270,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.lab) {
      page.drawText(`Lab: ${data.lab}`, {
        x: 100,
        y: height - 300,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.experiment) {
      page.drawText(`Experiment: ${data.experiment}`, {
        x: 100,
        y: height - 330,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.teacher) {
      page.drawText(`Lab Instructor: ${data.teacher}`, {
        x: 100,
        y: height - 360,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.date) {
      page.drawText(`Date: ${data.date}`, {
        x: 100,
        y: height - 390,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    // Add mechanical-specific sections
    page.drawText('EXPERIMENT SETUP', {
      x: 100,
      y: height - 450,
      size: 18,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText('Equipment Used:', {
      x: 100,
      y: height - 480,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Procedure:', {
      x: 100,
      y: height - 510,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Readings:', {
      x: 100,
      y: height - 540,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Calculations:', {
      x: 100,
      y: height - 570,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Conclusion:', {
      x: 100,
      y: height - 600,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error('Error generating Mechanical lab manual:', error);
    throw new Error('Failed to generate Mechanical lab manual PDF');
  }
}

export async function generatePhysicsLabManual(data: TemplateData): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    
    let font, regularFont;
    try {
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    } catch (error) {
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    }

    const { width, height } = page.getSize();
    const titleFontSize = 24;
    const regularFontSize = 14;

    // Title
    page.drawText('PHYSICS LABORATORY MANUAL', {
      x: width / 2 - font.widthOfTextAtSize('PHYSICS LABORATORY MANUAL', titleFontSize) / 2,
      y: height - 80,
      size: titleFontSize,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Student details (same structure)
    page.drawText(`Student Name: ${data.name}`, {
      x: 100,
      y: height - 150,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Roll Number: ${data.rollNo}`, {
      x: 100,
      y: height - 180,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    if (data.course) {
      page.drawText(`Course: ${data.course}`, {
        x: 100,
        y: height - 210,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.semester) {
      page.drawText(`Semester: ${data.semester}`, {
        x: 100,
        y: height - 240,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.subject) {
      page.drawText(`Subject: ${data.subject}`, {
        x: 100,
        y: height - 270,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.lab) {
      page.drawText(`Lab: ${data.lab}`, {
        x: 100,
        y: height - 300,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.experiment) {
      page.drawText(`Experiment: ${data.experiment}`, {
        x: 100,
        y: height - 330,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.teacher) {
      page.drawText(`Lab Instructor: ${data.teacher}`, {
        x: 100,
        y: height - 360,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    if (data.date) {
      page.drawText(`Date: ${data.date}`, {
        x: 100,
        y: height - 390,
        size: regularFontSize,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }

    // Add physics-specific sections
    page.drawText('SCIENTIFIC METHOD', {
      x: 100,
      y: height - 450,
      size: 18,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText('Objective:', {
      x: 100,
      y: height - 480,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Apparatus:', {
      x: 100,
      y: height - 510,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Theory:', {
      x: 100,
      y: height - 540,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Observations:', {
      x: 100,
      y: height - 570,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Analysis:', {
      x: 100,
      y: height - 600,
      size: regularFontSize,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error('Error generating Physics lab manual:', error);
    throw new Error('Failed to generate Physics lab manual PDF');
  }
}

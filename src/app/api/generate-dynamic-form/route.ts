import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { placeholders } = await request.json();

    if (!placeholders || !Array.isArray(placeholders)) {
      return NextResponse.json(
        { success: false, error: 'Placeholders array is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Generating dynamic form for placeholders:', placeholders);

    // Generate form fields based on placeholders
    const formFields = placeholders.map((placeholder, index) => {
      const fieldName = placeholder.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const label = placeholder.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      
      // Determine field type based on placeholder name
      let fieldType = 'text';
      let placeholder_text = `Enter ${label}`;
      
      if (placeholder.toLowerCase().includes('email')) {
        fieldType = 'email';
        placeholder_text = 'Enter email address';
      } else if (placeholder.toLowerCase().includes('phone') || placeholder.toLowerCase().includes('mobile')) {
        fieldType = 'tel';
        placeholder_text = 'Enter phone number';
      } else if (placeholder.toLowerCase().includes('date') || placeholder.toLowerCase().includes('year')) {
        fieldType = 'date';
        placeholder_text = 'Select date';
      } else if (placeholder.toLowerCase().includes('number') || placeholder.toLowerCase().includes('roll') || placeholder.toLowerCase().includes('id')) {
        fieldType = 'number';
        placeholder_text = 'Enter number';
      } else if (placeholder.toLowerCase().includes('description') || placeholder.toLowerCase().includes('details') || placeholder.toLowerCase().includes('address')) {
        fieldType = 'textarea';
        placeholder_text = 'Enter details';
      }

      return {
        id: `field_${index}`,
        name: fieldName,
        label: label,
        type: fieldType,
        placeholder: placeholder_text,
        required: true,
        placeholderKey: placeholder
      };
    });

    // Generate form configuration
    const formConfig = {
      title: 'Fill Template Details',
      description: 'Please fill in all the required details to generate your personalized document.',
      fields: formFields,
      submitText: 'Generate Document',
      validation: {
        required: formFields.map(field => field.name)
      }
    };

    console.log('✅ Dynamic form generated successfully');

    return NextResponse.json({
      success: true,
      formConfig,
      message: 'Dynamic form generated successfully'
    });

  } catch (error) {
    console.error('❌ Dynamic form generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate dynamic form' },
      { status: 500 }
    );
  }
}

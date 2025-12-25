/**
 * Student Registration API Route
 * POST /api/students/register
 * Handles student registration submissions
 */

import { NextRequest, NextResponse } from 'next/server';
import type { StudentRegistration } from '@/types/student';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: StudentRegistration = await request.json();

    // Validate required fields
    const requiredFields: (keyof StudentRegistration)[] = [
      'firstName',
      'lastName',
      'email',
      'major',
      'graduationYear',
      'skills',
      'linkedInUrl',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, message: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate email format (basic check for @.edu)
    const eduEmailRegex = /^[^@\s]+@[^@\s]+\.edu$/;
    if (!eduEmailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, message: 'Please use your @.edu email address' },
        { status: 400 }
      );
    }

    // Validate skills array
    if (!Array.isArray(body.skills) || body.skills.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Please select at least one skill' },
        { status: 400 }
      );
    }

    // TODO: Save to database (Supabase integration)
    // For now, just log the registration
    console.log('New student registration:', {
      name: `${body.firstName} ${body.lastName}`,
      email: body.email,
      major: body.major,
      graduationYear: body.graduationYear,
      skills: body.skills,
      timestamp: new Date().toISOString(),
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Registration submitted successfully',
        data: {
          email: body.email,
          // Return a placeholder ID until database is connected
          studentId: `temp-${Date.now()}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed. Use POST to register.' },
    { status: 405 }
  );
}

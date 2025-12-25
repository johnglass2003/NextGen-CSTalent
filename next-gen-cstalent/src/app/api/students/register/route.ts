/**
 * Student Registration API Route
 * POST /api/students/register
 * Handles student registration submissions
 */

import { NextRequest, NextResponse } from 'next/server';
import type { StudentRegistration } from '@/types/student';
import { supabase } from '@/lib/supabase/client';

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

    // Save to Supabase database
    const { data, error } = await supabase
      .from('students')
      .insert({
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        major: body.major,
        graduation_year: body.graduationYear,
        gpa: body.gpa || null,
        linkedin_url: body.linkedInUrl,
        skills: body.skills,
        location_preferences: body.locationPreferences || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      
      // Handle unique constraint violation (duplicate email)
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, message: 'This email is already registered' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { success: false, message: 'Failed to save registration' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Registration submitted successfully',
        data: {
          email: body.email,
          studentId: data.id,
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

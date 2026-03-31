/*
  # Emergency Gas Assistance Platform Database Schema

  ## Overview
  Complete database schema for an emergency gas assistance and connection platform
  that connects gas seekers with helpers and providers.

  ## New Tables

  ### 1. `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text)
  - `phone` (text)
  - `role` (text) - seeker, helper, or provider
  - `avatar_url` (text, optional)
  - `latitude` (numeric, optional)
  - `longitude` (numeric, optional)
  - `address` (text, optional)
  - `is_available` (boolean) - for helpers
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `providers`
  Gas agency/provider information
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `business_name` (text)
  - `business_type` (text) - LPG, CNG, or both
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `address` (text)
  - `contact_number` (text)
  - `is_verified` (boolean)
  - `created_at` (timestamptz)

  ### 3. `requests`
  Emergency gas assistance requests
  - `id` (uuid, primary key)
  - `seeker_id` (uuid, references profiles)
  - `helper_id` (uuid, references profiles, optional)
  - `cylinder_type` (text) - LPG or CNG
  - `status` (text) - pending, accepted, completed, cancelled
  - `message` (text)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `address` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `messages`
  Chat messages between users
  - `id` (uuid, primary key)
  - `request_id` (uuid, references requests)
  - `sender_id` (uuid, references profiles)
  - `receiver_id` (uuid, references profiles)
  - `content` (text)
  - `is_read` (boolean)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies ensure users can only access their own data
  - Helpers can view pending requests
  - All authenticated users can view provider listings
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'seeker' CHECK (role IN ('seeker', 'helper', 'provider')),
  avatar_url text,
  latitude numeric,
  longitude numeric,
  address text,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create providers table
CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  business_type text NOT NULL CHECK (business_type IN ('LPG', 'CNG', 'Both')),
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  address text NOT NULL,
  contact_number text NOT NULL,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  helper_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  cylinder_type text NOT NULL CHECK (cylinder_type IN ('LPG', 'CNG')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
  message text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_providers_location ON providers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_seeker ON requests(seeker_id);
CREATE INDEX IF NOT EXISTS idx_requests_helper ON requests(helper_id);
CREATE INDEX IF NOT EXISTS idx_messages_request ON messages(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Providers policies
CREATE POLICY "Anyone can view verified providers"
  ON providers FOR SELECT
  TO authenticated
  USING (is_verified = true);

CREATE POLICY "Provider users can insert their provider info"
  ON providers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'provider'
    )
  );

CREATE POLICY "Provider users can update their provider info"
  ON providers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Requests policies
CREATE POLICY "Users can view relevant requests"
  ON requests FOR SELECT
  TO authenticated
  USING (
    seeker_id = auth.uid() 
    OR helper_id = auth.uid()
    OR (status = 'pending' AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'helper'
    ))
  );

CREATE POLICY "Seekers can create requests"
  ON requests FOR INSERT
  TO authenticated
  WITH CHECK (
    seeker_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('seeker', 'helper')
    )
  );

CREATE POLICY "Seekers and helpers can update requests"
  ON requests FOR UPDATE
  TO authenticated
  USING (seeker_id = auth.uid() OR helper_id = auth.uid())
  WITH CHECK (seeker_id = auth.uid() OR helper_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();